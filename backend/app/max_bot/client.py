import os
import ssl

import httpx
import truststore


class MaxAPIError(Exception):
    def __init__(self, status: int | None = None, reason: str = "api_error"):
        self.reason = reason
        self.status = status
        super().__init__(f"MAX API failure (reason={reason}, status={status})")


class MaxClient:
    def __init__(self, token: str, transport=None):
        context = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        if os.getenv("SSL_CERT_FILE") or os.getenv("SSL_CERT_DIR"):
            context.load_verify_locations(cafile=os.getenv("SSL_CERT_FILE"), capath=os.getenv("SSL_CERT_DIR"))
        self.http = httpx.AsyncClient(
            base_url="https://platform-api2.max.ru",
            headers={"Authorization": token},
            timeout=httpx.Timeout(40, connect=10), transport=transport, verify=context,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.http.aclose()

    async def request(self, method: str, path: str, **kwargs) -> dict:
        try:
            response = await self.http.request(method, path, **kwargs)
        except httpx.RequestError as error:
            if "CERTIFICATE_VERIFY_FAILED" in str(error):
                reason = "tls_certificate_untrusted"
            elif isinstance(error, httpx.TimeoutException):
                reason = "timeout"
            elif isinstance(error, httpx.ConnectError):
                reason = "connection_failed"
            else:
                reason = "transport_error"
            raise MaxAPIError(reason=reason) from None
        if not response.is_success:
            raise MaxAPIError(response.status_code)
        try:
            data = response.json()
        except ValueError:
            raise MaxAPIError(reason="invalid_json") from None
        if not isinstance(data, dict):
            raise MaxAPIError(reason="invalid_response")
        return data

    async def get_me(self):
        return await self.request("GET", "/me")

    async def get_subscriptions(self):
        data = await self.request("GET", "/subscriptions")
        if not isinstance(data.get("subscriptions"), list):
            raise MaxAPIError()
        return data["subscriptions"]

    async def get_updates(self, marker: int | None):
        params = {"timeout": 30, "limit": 100, "types": "bot_started,message_created"}
        if marker is not None:
            params["marker"] = marker
        return await self.request("GET", "/updates", params=params)

    async def send_message(self, chat_id: int, body: dict):
        # No automatic POST retry: a timeout does not prove the message was not sent.
        return await self.request("POST", "/messages", params={"chat_id": chat_id}, json=body)
