# Security Specification for Firestore Database

## 1. Data Invariants
- **Profiles & Roles Safety**: A user's profile can only be written during creation/update by the authenticated user with a matching ID. A user cannot self-assign an admin/operational role or block themselves/others. Only actual administrators can write to the `user_roles` collection or modify user roles.
- **Project Scope Isolation**: Standard users can read projects. Only user accounts with the `admin` role are authorized to create, update, or delete project entries.
- **Financial Registry Containment**: Ledger entries, transactions, and cash/bank accounts are fully locked. Only administrators are authorized to perform any create, update, or delete operations on financial collections.
- **Service Order Verification**: A Service Order must have a valid Creator and a valid Executor. The creator has authority to change fields, and the assignee (executor) can only submit updates representing completion status changes (`completed_by_executor` and `status`).

---

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads target typical vulnerabilities in basic rules configurations, such as updates without field-level restrictions:

1. **Self-Escalation Model (roles modification)**: Standard user attempts to insert an `admin` role document mapping to their own UID.
2. **Profile Hijacking**: User `A` attempts to update the profile document of user `B`.
3. **Ghost Creation**: Standard user attempts to insert or update a Project document though they are not an administrator.
4. **Financial Infiltration**: Non-admin user attempts to create a ledger transaction with zero value or negative values to simulate budget depletion.
5. **Admin Spoofing Payload**: Standard user signs in and sends an update request containing an `isAdmin: true` attribute or setting role fields in profiles.
6. **Task Phase Shortcut**: User updates a task status to "completed" without filling in required relational identifiers or bypassing the project milestones.
7. **Service Order Forgery**: Standard user attempts to create a service order and sets `created_by` to the ID of an admin to spoof authority.
8. **Double Approval Hijack**: Executive/Assignee attempts to set both `completed_by_executor` and `approved_by_creator` on a Service Order concurrently.
9. **Notification Spamming**: Malicious user attempts to write multiple alert documents targeting another user's profile feed without validation.
10. **Global Setting Destruction**: Standard contractor attempts to overwrite the global `company_settings` document, changing the company name or removing the logo.
11. **PII Exposure Query**: Non-related operator attempts a broad listing of other users' profile emails or telephone numbers.
12. **System Field Overwrite**: User attempts to update a task's `created_at` or `is_template` value to alter history.

---

## 3. Conceptual Security Test Plan
The security rules structure uses the Zero-Trust master gates. Below is the blueprint of tests verification (e.g. `firestore.rules.test.ts` / emulation targets):
- Deny profiles creation where `auth.uid != resource.id`
- Deny roles creation by any account lacking the `admin` document
- Reject update to financial transactions for any non-admin account
- Prevent updating immutable metadata (such as `created_at` or `project_code`)
