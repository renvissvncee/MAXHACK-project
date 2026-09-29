export {};

declare global {
  interface Window {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: {
        start_param?: string;
      };
      /** Tells the MAX host our first paint is done — some hosts keep their
       * own loading/placeholder chrome up (at a different size) until this
       * fires. */
      ready?: () => void;
    };
  }
}
