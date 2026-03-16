Critical Instructions

Before writing or modifying any code, follow these rules carefully.

Analyze the existing codebase first

Inspect the current Prisma schema.

Identify how experts, services, and profiles are currently stored.

Review existing API routes and frontend forms related to expert profiles and services.

Do NOT immediately modify files.

First explain what changes are required.

Then propose a step-by-step implementation plan.

Work in small incremental steps.

Never implement everything at once.

Complete and verify each step before moving to the next.

Avoid breaking existing functionality.

Maintain backward compatibility wherever possible.

If a change could break something, explain the impact before implementing it.

Database schema changes must be handled carefully.

Propose schema modifications first.

After approval, implement Prisma schema updates.

Then run migrations.

Only after that update backend APIs and frontend forms.

File uploads must be handled securely

Only allow PDF and image formats.

Validate file size.

Store document URLs in the database.

All prices in the system must use EUR.

Location data must support Google Places Autocomplete for address selection.

Feature Requirements

The Expert Profile system must be extended with the following capabilities.

1 Expert Profile Improvements

The current expert profile form is missing several required fields.

Add support for the following fields.

Short Summary

A short 1–2 sentence description of the expert.

Purpose:
Displayed in the hero section of the public expert profile page.

Constraint:
Approximately 150–200 characters.

Expert Position

A short professional title displayed below the expert’s name.

Example:

Infant Feeding Specialist

Postnatal Physiotherapist

Lactation Consultant

This is separate from qualifications.

Session Format

Experts must specify how they conduct sessions.

Possible options:

Online

In-Person

Both

Purpose:
Controls which booking buttons appear on the expert’s public profile.

This field is critical for booking flow logic.

Location / Address

Required only if the expert offers in-person sessions.

The address must include:

Street address

City

Postcode

Parents must be able to see the location on the public profile page.

Use Google Places Autocomplete to help experts enter the address.

Languages Spoken

Experts must be able to select multiple languages they can conduct sessions in.

Purpose:
Allows parents to find experts who speak their language.

2 Qualifications System

The current profile contains a free-text “Expertise” field.

This must be replaced with a structured multi-select qualification system.

Experts must be able to:

Select one or more predefined qualifications.

Upload supporting documentation for each qualification.

Documents will later be reviewed by an administrator before the profile is approved.

Predefined Qualifications List

The system must support the following qualifications:

Lactation Consultant (IBCLC)

Breastfeeding Counsellor

Infant Sleep Consultant

Doula

Midwife

Baby Osteopath

Paediatric Nutritionist

Early Years Specialist

Postnatal Physiotherapist

Parenting Coach

Other (with free-text input)

If Other is selected, the expert must provide the qualification name manually.

Each qualification must allow document upload for verification.

3 Certifications

Experts may also add additional certifications or training.

For each certification the expert must provide:

Certification name

Supporting document (PDF or image)

These certifications help build trust with parents.

4 Professional Insurance (Mandatory)

Experts must upload proof of professional insurance before their profile can be approved.

Accepted types may include:

Public Liability Insurance

Professional Indemnity Insurance

The system must store:

Insurance document

Policy expiry date

Profiles must not be approved if insurance is missing or expired.

5 Services System Improvements

The Add Service form must also be updated.

Each service must support the following fields.

Service Description

A short description of what the service includes.

Displayed on the expert profile page.

Service Format

Each service must specify whether it is:

Online

In-Person

This determines which booking CTA appears.

Service Cluster

Services must belong to one of the following categories:

For Mum

For Baby

Package

Gift

This allows services to be grouped on the profile page.

Price Currency

All services on the platform must use EUR.

Ensure:

Prices are stored consistently in EUR.

Frontend displays the correct currency symbol.

6 Document Upload System

The system must support uploading documents for:

Qualifications

Certifications

Insurance

Constraints:

Allowed file types:

PDF

PNG

JPG

JPEG

File size should be validated.

Uploaded documents must be linked to the expert profile in the database.

7 Frontend Updates

Update the Edit Expert Profile form to include:

Short Summary

Expert Position

Session Format

Address with Google Autocomplete

Languages multi-select

Qualifications multi-select with document upload

Certifications with upload

Insurance upload with expiry date

Update the Add Service form to include:

Service description

Service format

Service cluster

Price in EUR

8 Public Expert Profile Impact

The following fields will appear on the public expert profile page:

Hero Section:

Expert name

Expert position

Short summary

Profile Details:

Languages spoken

Qualifications

Certifications

Location

Services Section:

Service description

Price in EUR

Book Online / Book In-Person buttons

Implementation Process

Follow this process strictly.

Step 1
Analyze the existing database schema and models.

Step 2
Propose necessary schema changes.

Step 3
After confirmation, implement Prisma schema updates and migrations.

Step 4
Update backend APIs.

Step 5
Implement document upload logic.

Step 6
Update frontend forms.

Step 7
Add validation rules.

Step 8
Test the full expert profile flow.

Important Constraint

Do NOT attempt to implement everything in a single step.

Instead:

complete one step

verify it

then proceed to the next step

This ensures the system remains stable.