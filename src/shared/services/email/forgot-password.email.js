/* eslint-disable max-len */
export const forgotPasswordTemplate = (name, tempPassword, expiresIn) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Workbench</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
              <tr>
                <td style="border: 2px solid #000000; padding: 40px;">
                  <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #000000; font-weight: bold;">Workbench</h1>

                  <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #000000; font-weight: normal;">Password Reset Request</h2>

                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #000000;">
                    Hello ${name},
                  </p>

                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #000000;">
                    We received a request to reset your password. Use the temporary password below to reset your password:
                  </p>

                  <div style="background-color: #f5f5f5; border: 1px solid #000000; padding: 20px; margin: 0 0 20px 0; text-align: center;">
                    <p style="margin: 0; font-size: 24px; font-weight: bold; color: #000000; letter-spacing: 2px;">
                      ${tempPassword}
                    </p>
                  </div>

                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #000000;">
                    This temporary password will expire in ${expiresIn}.
                  </p>

                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #000000;">
                    If you did not request a password reset, please ignore this email.
                  </p>

                  <hr style="border: none; border-top: 1px solid #000000; margin: 30px 0;">

                  <p style="margin: 0; font-size: 14px; line-height: 20px; color: #666666;">
                    This is an automated message from Workbench. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const passwordResetSuccessTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful - Workbench</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
              <tr>
                <td style="border: 2px solid #000000; padding: 40px;">
                  <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #000000; font-weight: bold;">Workbench</h1>

                  <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #000000; font-weight: normal;">Password Reset Successful</h2>

                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #000000;">
                    Hello ${name},
                  </p>

                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #000000;">
                    Your password has been successfully reset.
                  </p>

                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #000000;">
                    You can now login to your account using your new password.
                  </p>

                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #000000;">
                    If you did not make this change, please contact support immediately.
                  </p>

                  <hr style="border: none; border-top: 1px solid #000000; margin: 30px 0;">

                  <p style="margin: 0; font-size: 14px; line-height: 20px; color: #666666;">
                    This is an automated message from Workbench. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
