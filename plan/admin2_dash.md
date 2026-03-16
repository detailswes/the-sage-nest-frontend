📌 Task: Implement Admin Dashboard Features for Expert Account Management
⚠️ Important Instructions (Read Before Starting)

First, carefully read and understand the entire codebase.

Review the existing authentication system, user/expert models, and admin-related modules.

Identify how email verification, password reset, and account status are currently handled.

Check existing database schema, services, controllers, and email utilities.

Ensure that any new implementation:

Integrates cleanly with the current architecture

Does not break existing authentication or onboarding flows

Follows the project's coding standards and folder structure

Uses existing services/utilities wherever possible instead of duplicating logic

Before implementing new logic:

Verify if similar functionality already exists (e.g., password reset email service).

Extend or reuse existing functionality instead of creating redundant code.

Maintain clear error handling, logging, and proper authorization checks so that only admins can perform these actions.

Admin Dashboard – Expert Account Management

The admin dashboard must provide tools to allow platform administrators to support experts with account issues without requiring manual database changes.

Admins should be able to manage expert accounts directly from the dashboard.

Required Features
1️⃣ Trigger Password Reset

Admins must be able to trigger a password reset email for any expert.

Behavior:

Admin selects an expert from the admin panel.

Admin clicks “Send Password Reset”.

The system sends a standard password reset email to the expert.

Requirements:

Reuse the existing password reset email flow.

Do not create a separate reset mechanism.

Ensure secure token generation and expiration handling.

2️⃣ Resend Verification Email

Admins must be able to resend the email verification link to experts who did not complete verification.

Behavior:

Admin selects an expert.

Admin clicks “Resend Verification Email”.

System sends the same verification email used during signup.

Requirements:

Only applicable to unverified experts.

Reuse the existing verification email logic.

3️⃣ Manually Verify Expert Account

Admins must be able to manually verify an expert’s account.

This is useful in situations where:

The expert confirmed their identity through another channel

Email verification failed or was lost

Behavior:

Admin clicks “Verify Account”.

The system sets the expert's email verification status to verified.

Requirements:

Update the appropriate verification field in the database.

Log the action for auditing.

4️⃣ Suspend / Deactivate Expert Account

Admins must be able to deactivate or suspend an expert account even after approval.

This is separate from onboarding approval.

Behavior:

Admin clicks Suspend/Deactivate.

Suspended experts:

Cannot log in

Cannot create or manage sessions

Cannot access expert dashboard

Requirements:

Maintain a clear account status state.

Ensure authentication checks respect suspended status.

5️⃣ Expert Account Status Visibility

Each expert must clearly display their current account status in the admin dashboard.

Possible Status Values

Unverified
Email not verified yet.

Pending Approval
Email verified but waiting for admin approval.

Approved
Fully active expert.

Suspended
Account temporarily disabled by admin.

Additional Implementation Notes

Ensure admin-only access control for all these actions.

Update the admin UI to display:

Expert name

Email

Account status

Available admin actions

Include confirmation prompts before critical actions like suspension.

Maintain audit logs for admin actions if the system supports logging.

✅ Goal:
Allow admins to fully manage expert accounts directly from the dashboard without needing manual database updates.




Admin Dashboard
Admin account management and support tools
As platform admin you must be able to support experts with account issues without asking Chahat to manually fix things in the database each time.
– Trigger password reset: send a reset email to any expert directly from the admin panel.
– Resend verification email: for experts who missed or lost their confirmation email.
– Manually verify an account: override email verification if needed — e.g. expert confirmed identity verbally.
– Suspend or deactivate: in addition to Approve/Reject at onboarding, you must be able to deactivate an active expert at any point.
– Account status visibility: each expert must clearly show their status — Unverified / Pending Approval / Approved / Suspended — so you can act quickly