# Security Specification - JobsEdge AI

## Data Invariants
1. A **User Profile** must have a valid `uid` matching the auth ID, a `fullName`, and a `role`. Users cannot change their own `role` or `uid` after creation.
2. A **Resume** is owned by a single user (Candidate). Only the owner can write it. Employers can read resumes if they have an active application.
3. a **Job Opening** is owned by an Employer. Only the creating employer can edit or delete it.
4. A **Job Application** is created by a Candidate. It links a Job and a Candidate.
   - Candidates can only update the application to withdraw (if applicable) or on initial creation.
   - Employers who own the Job can update the application `status` and `aiAnalysis`.
   - The `status` field must transition from `pending` -> `shortlisted` or `rejected`. Once terminal, it cannot be changed. (Note: Simple terminal logic for now).

## The Dirty Dozen Payloads

1. **Identity Spoofing (User)**: Create a user profile with a `uid` that doesn't match the authenticated UID.
   - `setDoc(doc(db, 'users', 'other_uid'), { uid: 'other_uid', ... })` -> **DENIED**
2. **Privilege Escalation (User)**: Update own user profile to change `role` from 'candidate' to 'employer'.
   - `updateDoc(doc(db, 'users', my_uid), { role: 'employer' })` -> **DENIED**
3. **Ghost Field Injection (User)**: Add a secret field `isAdmin: true` during profile creation.
   - `setDoc(doc(db, 'users', my_uid), { ..., isAdmin: true })` -> **DENIED**
4. **Unauthorized Resume Read**: Candidate A tries to read Candidate B's resume directly.
   - `getDoc(doc(db, 'resumes', 'candidate_b_uid'))` -> **DENIED** (unless specific relational access is enforced)
5. **Unauthorized Job Update**: Employer B tries to edit a job posted by Employer A.
   - `updateDoc(doc(db, 'jobs', 'job_a_id'), { title: 'Hacked' })` -> **DENIED**
6. **Job ID Poisoning**: Create a job with a 1MB string as the Document ID.
   - `setDoc(doc(db, 'jobs', 'a'.repeat(1024*1024)), { ... })` -> **DENIED** (via `isValidId`)
7. **Application Hijacking**: Candidate A submits a job application on behalf of Candidate B.
   - `setDoc(doc(db, 'applications', 'app_id'), { candidateUid: 'candidate_b_uid', ... })` -> **DENIED**
8. **Status Shortcutting (Application)**: Candidate sets their own application status to 'shortlisted' during creation.
   - `setDoc(doc(db, 'applications', 'app_id'), { status: 'shortlisted', ... })` -> **DENIED**
9. **Outcome Tampering (Application)**: Candidate tries to change the `aiAnalysis` field.
   - `updateDoc(doc(db, 'applications', 'app_id'), { aiAnalysis: 'EXCELLENT MATCH' })` -> **DENIED**
10. **Resource Exhaustion (Job)**: Update a job with a 2MB description string.
    - `updateDoc(doc(db, 'jobs', 'id'), { description: 'a'.repeat(2000000) })` -> **DENIED** (via `.size()`)
11. **Timestamp Spoofing**: Provide a past `createdAt` timestamp from the client.
    - `setDoc(doc(db, 'users', id), { createdAt: new Date('2000-01-01') })` -> **DENIED**
12. **Orphaned Application**: Create an application for a non-existent Job ID.
    - `setDoc(doc(db, 'applications', id), { jobId: 'fake_job_id', ... })` -> **DENIED** (via `exists()`)
