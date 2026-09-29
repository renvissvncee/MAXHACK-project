from app.services.localities import require_locality


async def update_profile(db, user, patch):
    values = patch.model_dump(exclude_unset=True)
    locality_id = values.pop("locality_id", None)
    if "locality_id" in patch.model_fields_set:
        locality = await require_locality(db, locality_id)
        user.locality_id = locality.id
        user.locality = locality
        user.city = locality.short_label
    for field, value in values.items():
        setattr(user, field, value)
    await db.commit()
    return user
