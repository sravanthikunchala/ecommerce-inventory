from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.hashers import check_password

def validate_otp(model_instance, plain_otp, expiry_minutes=5):
    """
    Generic OTP validation for any model that has:
    - otp (hashed or plain)
    - changed_on (datetime)
    """
    if not getattr(model_instance, "otp", None) or not plain_otp:
        return False

    try:
        stored_otp = str(model_instance.otp)

        # ✅ Check both hashed and plain OTP
        if not (check_password(str(plain_otp), stored_otp) or str(plain_otp) == stored_otp):
            return False

    except Exception as e:
        print("OTP check error:", e)
        return False

    changed_on = getattr(model_instance, "changed_on", None)
    if not changed_on:
        return False

    expiry_time = changed_on + timedelta(minutes=expiry_minutes)
    return timezone.now() <= expiry_time
