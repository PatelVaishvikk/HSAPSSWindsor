export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
];

export const EDUCATION_OPTIONS = [
  { value: '', label: 'Select Education' },
  { value: 'high_school', label: 'High School' },
  { value: 'bachelors', label: 'Bachelors' },
  { value: 'masters', label: 'Masters' },
  { value: 'phd', label: 'PhD' },
  { value: 'pg_diploma', label: 'Post Graduate Diploma' },
  { value: 'other', label: 'Other' }
];

export const POST_GRAD_OPTIONS = [
  { value: 'working', label: 'Working' },
  { value: 'job_search', label: 'Job Searching' },
  { value: 'higher_studies', label: 'Higher Studies' },
  { value: 'entrepreneur', label: 'Entrepreneurship' },
  { value: 'other', label: 'Other' }
];

export const STUDENT_PORTAL_FIELD_DEFS = [
  { name: 'first_name', label: 'First Name', type: 'text', required: true },
  { name: 'last_name', label: 'Last Name', type: 'text', required: true },
  { name: 'mail_id', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
  { name: 'gender', label: 'Gender', type: 'select', options: GENDER_OPTIONS },
  { name: 'address', label: 'Address', type: 'textarea', rows: 3 },
  { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { name: 'education', label: 'Education / Degree', type: 'select', options: EDUCATION_OPTIONS },
  { name: 'study_institution', label: 'Study Institution', type: 'text' },
  { name: 'study_program', label: 'Study Program', type: 'text' },
  { name: 'study_specialization', label: 'Study Specialization', type: 'text' },
  { name: 'study_level', label: 'Study Level', type: 'text' },
  { name: 'study', label: 'Area of Study', type: 'text' },
  { name: 'emergency_contact', label: 'Emergency Contact', type: 'tel' },
  { name: 'graduation_completed', label: 'Graduation Completed', type: 'checkbox' },
  { name: 'graduation_date', label: 'Graduation Date', type: 'date' },
  { name: 'post_graduation_plan', label: 'Post Graduation Plan', type: 'select', options: POST_GRAD_OPTIONS },
  { name: 'employment_status', label: 'Employment Status', type: 'select', options: POST_GRAD_OPTIONS },
  { name: 'employment_company', label: 'Employer / Company', type: 'text' },
  { name: 'employment_role', label: 'Job Role / Title', type: 'text' },
  { name: 'notes', label: 'Additional Notes', type: 'textarea', rows: 3 }
];

export const STUDENT_PORTAL_FIELD_NAMES = STUDENT_PORTAL_FIELD_DEFS.map((field) => field.name);
