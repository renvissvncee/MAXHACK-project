async def update_profile(db, user, patch):
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    return user
