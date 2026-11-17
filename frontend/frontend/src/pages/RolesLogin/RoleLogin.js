import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../components/SignIn/Signin.css";
import Logo from "../../assets/images/DK mail logo.svg";
import LogInImage from "../../assets/images/login image.jpg";
import { IoClose } from "react-icons/io5";
import API_BASE_URL from "../../config";
import PopupMessage from "../../components/Popup/Popup";

const RoleLogin = ({ setIsRoleAuthenticated }) => {
  const [email, setEmail] = useState("");
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const navigate = useNavigate();
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [roleEmail, setRoleEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSentLoading, setOtpSentLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const showPopup = (text, type) => {
    setPopupMessage({ text, type });
    setTimeout(() => {
      setPopupMessage({ text: "", type: "" });
    }, 10000);
  };


  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleRoleLogin = async (isResend = false) => {
    if (isResend) {
      if (otpSentLoading) return;
      setOtpSentLoading(true);
    } else {
      if (loading) return;
      setLoading(true);
    }
    const targetEmail = roleEmail || email;

    if (!targetEmail) {
      showPopup("Email is required.", "error");
      if (isResend) setOtpSentLoading(false);
      else setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/role-login`, {
        email: targetEmail.toLowerCase().trim(),
      });

      if (response.data.status_code === 200) {
        setRoleEmail(targetEmail);
        setIsOtpStep(true);
        setResendTimer(120);
        showPopup(
          isResend
            ? "OTP resent successfully to your registered email."
            : "OTP sent to your registered email address.",
          "success"
        );
      } else {
        showPopup(response.data.error || "Login failed.", "error");
      }
    } catch (error) {
      showPopup(
        error.response?.data?.error || "Something went wrong.",
        "error"
      );
    } finally {
      if (isResend) setOtpSentLoading(false);
      else setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setVerifyLoading(true);
    if (!otp) {
      showPopup("Please enter the OTP.", "error");
      setVerifyLoading(false);
      return;
    }

    try {
      const verifyResponse = await axios.post(
        `${API_BASE_URL}/role-verify-otp`,
        {
          email: roleEmail,
          otp,
        }
      );

      const { status_code, error, role_id } = verifyResponse.data;

      if (status_code === 200) {
        showPopup("OTP Verified Successfully!", "success");
        setIsRoleAuthenticated(true);

        sessionStorage.setItem("roleId", role_id);
        sessionStorage.setItem("roleName", verifyResponse.data.role_name);
        sessionStorage.setItem("email", verifyResponse.data.email);
        sessionStorage.setItem("roleType", verifyResponse.data.role_type);

        navigate("/day-wise-consolidated-report");
      } else {
        const errorMessage = error || "OTP verification failed.";
        showPopup(errorMessage, "error");
        setOtp("");
      }
    } catch (err) {
      const message =
        err.response?.data?.error ||
        "Something went wrong during OTP verification.";
      showPopup(message, "error");
      setOtp("");
    } finally {
      setVerifyLoading(false);
    }
  };

  // Format countdown timer (e.g., 1:45)
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(1, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="customer-login-container">
      <div className="customer-login-form-section">
        <div>
          <img src={Logo} className="customer-login-logo" alt="Logo" />
        </div>
        <div className="sign-in-popup">
          {popupMessage.text && (
            <PopupMessage
              message={popupMessage.text}
              type={popupMessage.type}
              onClose={() => setPopupMessage({ text: "", type: "" })}
            />
          )}
        </div>


        <div className="customer-login-text">Role Login</div>
        <div className="login-form-info">Enter your email to continue.</div>

        <div className="customer-login-form-fields">
          <label className="customer-login-label">
            Email<span className="required-star">*</span>
          </label>
          <input
            type="email"
            className="customer-login-input-field"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleRoleLogin();
            }}
          />
        </div>

        <div className="customer-login-wrapper">
          <button
            className="customer-login-btn"
            onClick={() => handleRoleLogin()}
            disabled={loading}
          >
            <p className="customer-login-btn-text">
              {loading ? "Sending..." : "Send OTP"}
            </p>
          </button>
        </div>
      </div>

      <div className="customer-login-image-section">
        <div className="customer-login-image-text">
          "Let's Your Vision Take Flight."
        </div>
        <img className="customer-login-image" alt="Sign In" src={LogInImage} />
      </div>

      {isOtpStep && (
        <div className="otp-popup">
          <div className="otp-popup-content">
            <IoClose
              className="otp-close-icon"
              onClick={() => setIsOtpStep(false)}
            />
            <div className="otp-popup-heading">Enter OTP</div>
            <div className="otp-popup-input-field">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="otp-popup-input"
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleVerifyOtp();
                }}
                maxLength={6}
              />
            </div>

            <button
              onClick={handleVerifyOtp}
              className="otp-verify-btn"
              disabled={verifyLoading}
            >
              {verifyLoading ? "Verifying..." : "Verify"}
            </button>


            <div
              className="resend-otp-text"
              style={{
                color: "#3a3a98",
                fontWeight: 500,
                marginTop: "10px",
                cursor: resendTimer > 0 ? "default" : "pointer",
                opacity: resendTimer > 0 ? 0.6 : 1,
                textAlign: "center",
              }}
              onClick={() => {
                if (resendTimer === 0 && !otpSentLoading) handleRoleLogin(true);
              }}

              disable={otpSentLoading}
            >
              {otpSentLoading
                ? "Sending..."
                : resendTimer > 0
                  ? `Resend OTP in ${formatTimer(resendTimer)}`
                  : "Resend OTP"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleLogin;
