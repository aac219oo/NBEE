import type React from "react";

const AuthRedirectHint = ({ ...props }): React.ReactNode => {
  return (
    <div
      className="text-sm text-neutral"
      {...props}
    />
  );
};

export default AuthRedirectHint;
