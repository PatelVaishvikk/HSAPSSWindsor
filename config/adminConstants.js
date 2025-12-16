
export const INSTITUTION_OPTIONS = [
  { value: 'uwindsor', label: 'University of Windsor' },
  { value: 'st_clair', label: 'St. Clair College' },
  { value: 'other', label: 'Other' },
];

export const PROGRAM_LIBRARY = {
  uwindsor: [
    { value: 'masters_applied_computing', label: 'Masters of Applied Computing', level: 'masters' },
    { value: 'meng', label: 'Master of Engineering (MEng)', level: 'meng', specializations: ['Civil', 'ECE', 'Mechanical', 'Automobile'] },
    { value: 'mba', label: 'MBA', level: 'mba' },
    { value: 'msc', label: 'MSc', level: 'msc' },
    { value: 'uwindsor_other', label: 'Other Windsor Program', level: 'other' },
  ],
  st_clair: [
    { value: 'pg_business', label: 'Business', level: 'pg_diploma' },
    { value: 'pg_international_business_management', label: 'International Business Management', level: 'pg_diploma' },
    { value: 'pg_data_analytics', label: 'Data Analytics', level: 'pg_diploma' },
    { value: 'pg_predictive_data_analytics', label: 'Predictive Data Analytics', level: 'pg_diploma' },
    { value: 'pg_cybersecurity', label: 'Cybersecurity & IT Security', level: 'pg_diploma' },
    { value: 'pg_supply_chain', label: 'Supply Chain Management & Logistics', level: 'pg_diploma' },
    { value: 'pg_construction_project_management', label: 'Construction Project Management', level: 'pg_diploma' },
    { value: 'pg_health_care', label: 'Health Care Programs', level: 'pg_diploma', specializations: ['Nursing', 'Medical Laboratory', 'Fitness & Health Promotion', 'Occupational Therapist Assistant'] },
    { value: 'pg_engineering_technology', label: 'Engineering Technology', level: 'pg_diploma', specializations: ['Civil', 'Mechanical', 'Electrical', 'Biomedical'] },
    { value: 'pg_skilled_trades', label: 'Skilled Trades', level: 'pg_diploma', specializations: ['Carpentry', 'Welding', 'Plumbing', 'Refrigeration', 'Greenhouse Technician', 'Landscape Horticulture'] },
    { value: 'st_clair_other', label: 'Other St. Clair Program', level: 'pg_diploma' },
  ],
  other: [
    { value: 'other_program', label: 'Other Program', level: 'other' },
  ],
};

export const POST_GRAD_OPTIONS = [
  { value: 'working', label: 'Working' },
  { value: 'job_search', label: 'Job Searching' },
  { value: 'higher_studies', label: 'Higher Studies' },
  { value: 'entrepreneur', label: 'Entrepreneurship' },
  { value: 'other', label: 'Other' },
];

export const MANDAL_OPTIONS = [
  'Windsor', 'Brampton', 'Mississauga', 'Etobicoke', 'Kitchener', 'London', 'Hamilton', 'Other'
];

export const MUKT_OPTIONS = ['Yuvak', 'Yuvati', 'Ambrish', 'Expected'];

export const EDUCATION_LEVEL_LABELS = {
  masters: 'Masters',
  meng: 'Master of Engineering (MEng)',
  mba: 'MBA',
  msc: 'MSc',
  pg_diploma: 'PG Diploma',
  other: 'Other',
};
