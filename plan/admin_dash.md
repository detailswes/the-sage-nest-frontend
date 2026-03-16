Admin Dashboard — Expert Management Improvements

The current Admin Dashboard allows administrators to see a basic list of experts, including name, email, expertise, and status. However, several important capabilities are missing that are necessary to manage and review experts efficiently as the platform grows.

The admin interface must be extended to provide better visibility, filtering, and review capabilities before approving expert profiles.

All changes should be implemented carefully to ensure they integrate with the existing admin system without breaking current functionality.

Implementation Instructions

Before implementing any changes:

Analyze the existing admin dashboard implementation

Identify how experts are currently listed and managed.

Review the current database schema related to experts.

Inspect existing API endpoints used by the admin interface.

Do not immediately modify the code.

First outline the required changes and how they will integrate with the current system.

Implement improvements incrementally

Complete one feature at a time.

Ensure each change is tested before proceeding to the next.

Avoid breaking existing admin functionality

Ensure existing expert approval workflows continue to work.

1 Expert Detail View

The admin must be able to review the complete expert profile before approving it.

Currently the admin list only shows limited information. This is insufficient for verifying expert credentials.

The dashboard must support either:

a clickable detail view, or

an expandable row within the table

When expanded or opened, the admin should be able to view the expert’s full profile information.

The detail view should include:

Expert full name

Email address

Profile photo

Short summary

Full bio

Professional title / position

Languages spoken

Location (if available)

2 Qualification Verification

Admins must be able to review the expert's qualifications and uploaded proof documents.

The detail view should clearly display:

Selected qualifications from the predefined list

Any custom qualifications entered via the "Other" option

Uploaded qualification documents

Admins must be able to open or download these documents for verification.

3 Certifications Review

Experts may upload additional certifications beyond the main qualifications.

The admin interface must display:

Certification name

Uploaded certification document

These should also be viewable or downloadable.

4 Professional Insurance Verification

Professional insurance is mandatory before an expert profile can be approved.

The admin must be able to see:

Uploaded insurance document

Insurance policy expiry date

If the insurance is missing or expired, the system should clearly indicate this so the profile is not approved accidentally.

5 Expert Services Overview

The admin detail view must also show the services created by the expert.

For each service, the admin should be able to see:

Service title

Service description

Price

Service format (Online / In-Person)

Service cluster (For Mum, For Baby, Package, Gift)

This allows the admin to confirm that services meet platform guidelines before approval.

6 Search Functionality

The admin dashboard must include a search bar that allows quick lookup of experts.

The search should support:

First name

Last name

Full name

This allows administrators to quickly locate a specific expert.

7 Location Filter

Admins must be able to filter experts based on location.

Filtering should support:

City

Region (if available)

This is important for managing experts across different geographical areas.

8 Qualification Filter

Admins must be able to filter the expert list by qualification.

Examples:

Show all Lactation Consultants (IBCLC)

Show all Infant Sleep Consultants

Show all Doulas

The filter should use the structured qualification system, not free-text fields.

9 Expertise / Service Cluster Filter

Admins must also be able to filter experts by their broader area of expertise, based on their services or expertise categories.

Examples:

For Mum services

For Baby services

Package services

Gift services

This allows administrators to quickly analyze which types of experts are active on the platform.

10 Join Date

Each expert row in the admin list must display the date the expert registered on the platform.

Purpose:

Track new sign-ups

Prioritize reviewing recently registered experts

Monitor growth of the expert network

The join date should be clearly visible in the expert list.

11 Email Visibility

The expert’s email address must be visible in:

The admin list view

The expert detail view

This allows administrators to easily contact experts if:

additional verification is required

documents are missing

profile updates are needed

Expected Result

After implementing these improvements, the admin dashboard should allow administrators to:

View complete expert profiles

Verify qualifications and certifications

Review uploaded insurance documents

Inspect services created by experts

Search experts quickly

Filter experts by location, qualification, and expertise

Track when experts joined the platform

Contact experts directly via email

These capabilities will ensure the platform can safely review and approve experts as the number of users grows.