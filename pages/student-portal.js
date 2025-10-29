import { useMemo, useState } from 'react';
import Head from 'next/head';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { STUDENT_PORTAL_FIELD_DEFS, STUDENT_PORTAL_FIELD_NAMES } from '../config/studentPortalFields.js';

const DEFAULT_PASSWORD = 'dasnadas';

const passwordHint = `Default password is "${DEFAULT_PASSWORD}".`;

const INSTITUTION_OPTIONS = [
  { value: 'uwindsor', label: 'University of Windsor' },
  { value: 'st_clair', label: 'St. Clair College' },
  { value: 'other', label: 'Other' }
];

const PROGRAM_LIBRARY = {
  uwindsor: [
    { value: 'masters_applied_computing', label: 'Masters of Applied Computing', level: 'masters' },
    {
      value: 'meng',
      label: 'Master of Engineering (MEng)',
      level: 'meng',
      specializations: ['Civil', 'ECE', 'Mechanical', 'Automobile']
    },
    { value: 'mba', label: 'MBA', level: 'mba' },
    { value: 'msc', label: 'MSc', level: 'msc' },
    { value: 'uwindsor_other', label: 'Other Windsor Program', level: 'other' }
  ],
  st_clair: [
    { value: 'pg_business', label: 'Business', level: 'pg_diploma' },
    { value: 'pg_international_business_management', label: 'International Business Management', level: 'pg_diploma' },
    { value: 'pg_data_analytics', label: 'Data Analytics', level: 'pg_diploma' },
    { value: 'pg_predictive_data_analytics', label: 'Predictive Data Analytics', level: 'pg_diploma' },
    { value: 'pg_cybersecurity', label: 'Cybersecurity & IT Security', level: 'pg_diploma' },
    { value: 'pg_supply_chain', label: 'Supply Chain Management & Logistics', level: 'pg_diploma' },
    { value: 'pg_construction_project_management', label: 'Construction Project Management', level: 'pg_diploma' },
    {
      value: 'pg_health_care',
      label: 'Health Care Programs',
      level: 'pg_diploma',
      specializations: ['Nursing', 'Medical Laboratory', 'Fitness & Health Promotion', 'Occupational Therapist Assistant']
    },
    {
      value: 'pg_engineering_technology',
      label: 'Engineering Technology',
      level: 'pg_diploma',
      specializations: ['Civil', 'Mechanical', 'Electrical', 'Biomedical']
    },
    {
      value: 'pg_skilled_trades',
      label: 'Skilled Trades',
      level: 'pg_diploma',
      specializations: ['Carpentry', 'Welding', 'Plumbing', 'Refrigeration', 'Greenhouse Technician', 'Landscape Horticulture']
    },
    { value: 'st_clair_other', label: 'Other St. Clair Program', level: 'pg_diploma' }
  ],
  other: [
    { value: 'other_program', label: 'Other Program', level: 'other' }
  ]
};

const FIELD_CONFIG_MAP = new Map(
  STUDENT_PORTAL_FIELD_DEFS.map((field) => [field.name, field])
);

const buildInitialFormState = () =>
  STUDENT_PORTAL_FIELD_NAMES.reduce((acc, field) => {
    acc[field] = field === 'graduation_completed' ? false : '';
    return acc;
  }, {});

const getFieldColumnClass = (field) => {
  if (field.type === 'textarea') {
    return 'col-12';
  }
  if (field.type === 'checkbox') {
    return 'col-12 col-md-4';
  }
  if (['address', 'notes', 'study'].includes(field.name)) {
    return 'col-12';
  }
  if (field.type === 'date') {
    return 'col-12 col-md-6 col-xl-4';
  }
  return 'col-12 col-md-6';
};

export default function StudentPortalPage() {
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState(DEFAULT_PASSWORD);
  const [student, setStudent] = useState(null);
  const [formData, setFormData] = useState(buildInitialFormState);
  const [loginLoading, setLoginLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const graduationComplete = formData.graduation_completed || false;
  const workingPlan = formData.post_graduation_plan === 'working';

  const portalSections = useMemo(
    () => [
      {
        key: 'contact',
        icon: 'fas fa-id-card',
        title: 'Contact Information',
        subtitle: 'Keep your contact details and emergency info up to date.',
        fields: ['first_name', 'last_name', 'mail_id', 'phone', 'gender', 'address', 'emergency_contact']
      },
      {
        key: 'academic',
        icon: 'fas fa-graduation-cap',
        title: 'Academic Journey',
        subtitle: 'Let us know where and what you are studying.',
        fields: [
          'date_of_birth',
          'education',
          'study_institution',
          'study_program',
          'study_specialization',
          'study_level',
          'study'
        ]
      },
      {
        key: 'career',
        icon: 'fas fa-briefcase',
        title: 'Graduation & Career Plans',
        subtitle: 'Share your graduation status and next steps after school.',
        fields: [
          'graduation_completed',
          'graduation_date',
          'post_graduation_plan',
          'employment_status',
          'employment_company',
          'employment_role',
          'notes'
        ]
      }
    ],
    []
  );

  const institutionOptions = useMemo(() => {
    const base = [...INSTITUTION_OPTIONS];
    if (
      formData.study_institution &&
      !base.some((option) => option.value === formData.study_institution)
    ) {
      base.push({
        value: formData.study_institution,
        label: formData.study_institution
      });
    }
    return base;
  }, [formData.study_institution]);

  const availablePrograms = useMemo(
    () => PROGRAM_LIBRARY[formData.study_institution] || [],
    [formData.study_institution]
  );

  const selectedProgramDefinition = useMemo(
    () => availablePrograms.find((program) => program.value === formData.study_program) || null,
    [availablePrograms, formData.study_program]
  );

  const programOptions = useMemo(() => {
    const base = [...availablePrograms];
    if (formData.study_program && !base.some((program) => program.value === formData.study_program)) {
      base.push({
        value: formData.study_program,
        label: formData.study_program
      });
    }
    return base;
  }, [availablePrograms, formData.study_program]);

  const specializationOptions = useMemo(() => {
    const programDefinition = availablePrograms.find(
      (program) => program.value === formData.study_program
    );
    const base =
      programDefinition?.specializations?.map((name) => ({
        value: name,
        label: name
      })) || [];

    if (
      formData.study_specialization &&
      !base.some((option) => option.value === formData.study_specialization)
    ) {
      base.push({
        value: formData.study_specialization,
        label: formData.study_specialization
      });
    }

    return base;
  }, [availablePrograms, formData.study_program, formData.study_specialization]);

  const studySummary = useMemo(() => {
    const parts = [];
    if (selectedProgramDefinition) {
      parts.push(selectedProgramDefinition.label);
    } else if (formData.study_program) {
      parts.push(formData.study_program);
    }
    if (formData.study_specialization) {
      parts.push(formData.study_specialization);
    }
    return parts.join(' - ');
  }, [selectedProgramDefinition, formData.study_program, formData.study_specialization]);

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGraduationToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      graduation_completed: checked,
      graduation_date: checked ? prev.graduation_date : ''
    }));
  };

  const handlePostGradPlanChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      post_graduation_plan: value,
      employment_status: value,
      employment_company: value === 'working' ? prev.employment_company : '',
      employment_role: value === 'working' ? prev.employment_role : ''
    }));
  };

  const handleInstitutionChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      study_institution: value,
      study_program: '',
      study_specialization: '',
      study_level: '',
      study: ''
    }));
  };

  const handleProgramChange = (event) => {
    const value = event.target.value;
    const programDefinition = availablePrograms.find((program) => program.value === value) || null;
    const derivedLevel = programDefinition?.level || '';
    setFormData((prev) => {
      const nextSpecialization = programDefinition?.specializations?.includes(prev.study_specialization)
        ? prev.study_specialization
        : '';
      return {
        ...prev,
        study_program: value,
        study_specialization: nextSpecialization,
        study_level: derivedLevel || prev.study_level,
        education: prev.education || derivedLevel || '',
        study: ''
      };
    });
  };

  const handleSpecializationChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      study_specialization: value,
      study: ''
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoginLoading(true);

    try {
      const response = await fetch('/api/student-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loginPhone,
          password: loginPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to log in');
      }

      const normalizedForm = buildInitialFormState();
      STUDENT_PORTAL_FIELD_NAMES.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data.student, field)) {
          normalizedForm[field] =
            data.student[field] ?? (field === 'graduation_completed' ? false : '');
        }
      });

      setStudent(data.student);
      setFormData(normalizedForm);
      setSuccessMessage(
        'Welcome back! Update your details below and save your changes when you are done.'
      );
    } catch (error) {
      console.error('Student portal login failed:', error);
      setErrorMessage(error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!student?._id) {
      setErrorMessage('Missing student information. Please refresh and log in again.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setUpdateLoading(true);

    const updates = {};
    STUDENT_PORTAL_FIELD_NAMES.forEach((field) => {
      switch (field) {
        case 'study': {
          updates[field] = studySummary || formData[field] || '';
          break;
        }
        case 'study_level': {
          const derivedLevel =
            selectedProgramDefinition?.level ||
            formData.study_level ||
            formData.education ||
            '';
          updates[field] = derivedLevel;
          break;
        }
        case 'education': {
          const derivedEducation = formData.education || selectedProgramDefinition?.level || '';
          updates[field] = derivedEducation;
          break;
        }
        case 'graduation_date': {
          updates[field] = graduationComplete ? formData[field] : '';
          break;
        }
        case 'employment_company':
        case 'employment_role': {
          updates[field] = workingPlan ? formData[field] : '';
          break;
        }
        case 'post_graduation_plan': {
          updates[field] = formData.post_graduation_plan || '';
          break;
        }
        case 'employment_status': {
          updates[field] = formData.employment_status || formData.post_graduation_plan || '';
          break;
        }
        default: {
          updates[field] = formData[field];
        }
      }
    });

    try {
      const response = await fetch('/api/student-portal/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student._id,
          password: loginPassword,
          updates
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update details');
      }

      const normalizedForm = buildInitialFormState();
      STUDENT_PORTAL_FIELD_NAMES.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data.student, field)) {
          normalizedForm[field] =
            data.student[field] ?? (field === 'graduation_completed' ? false : '');
        }
      });

      setFormData(normalizedForm);
      setStudent(data.student);
      setSuccessMessage('Your details were updated successfully.');
    } catch (error) {
      console.error('Student portal update failed:', error);
      setErrorMessage(error.message || 'Update failed');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLogout = () => {
    setStudent(null);
    setFormData(buildInitialFormState());
    setLoginPhone('');
    setLoginPassword(DEFAULT_PASSWORD);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const renderFormControl = (field) => {
    const value =
      field.type === 'checkbox'
        ? Boolean(formData[field.name])
        : formData[field.name] ?? '';

    if (field.name === 'study_institution') {
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Select value={formData.study_institution || ''} onChange={handleInstitutionChange}>
            <option value="">Select study institution</option>
            {institutionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    if (field.name === 'study_program') {
      const disabled = !formData.study_institution;
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Select
            value={formData.study_program || ''}
            onChange={handleProgramChange}
            disabled={disabled}
          >
            <option value="">
              {disabled ? 'Select an institution first' : 'Select study program'}
            </option>
            {programOptions.map((program) => (
              <option key={program.value} value={program.value}>
                {program.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    if (field.name === 'study_specialization') {
      if (specializationOptions.length === 0) {
        return (
          <Form.Group controlId={`student-portal-${field.name}`}>
            <Form.Label>{field.label}</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter specialization (if applicable)"
              value={value}
              onChange={(event) => handleFieldChange(field.name, event.target.value)}
              disabled={!formData.study_program}
            />
          </Form.Group>
        );
      }

      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Select
            value={formData.study_specialization || ''}
            onChange={handleSpecializationChange}
            disabled={!formData.study_program}
          >
            <option value="">Select specialization</option>
            {specializationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    if (field.name === 'study') {
      const displayValue = studySummary || value;
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Control
            type="text"
            value={displayValue}
            placeholder="Summary appears after selecting a program"
            readOnly
            plaintext={false}
          />
        </Form.Group>
      );
    }

    if (
      field.type === 'select' &&
      !['study_institution', 'study_program', 'study_specialization'].includes(field.name)
    ) {
      const options = field.options || [];
      const hasEmptyOption = options.some((option) => option.value === '');
      const handleSelectChange = (event) => {
        const nextValue = event.target.value;
        if (field.name === 'post_graduation_plan') {
          handlePostGradPlanChange(nextValue);
        } else {
          handleFieldChange(field.name, nextValue);
        }
      };

      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Select value={value || ''} onChange={handleSelectChange}>
            {!hasEmptyOption && <option value="">Select {field.label.toLowerCase()}</option>}
            {options.map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    if (field.type === 'checkbox') {
      const onToggle = (event) => {
        if (field.name === 'graduation_completed') {
          handleGraduationToggle(event.target.checked);
        } else {
          handleFieldChange(field.name, event.target.checked);
        }
      };

      return (
        <Form.Group controlId={`student-portal-${field.name}`} className="pt-2">
          <Form.Check type="switch" label={field.label} checked={value} onChange={onToggle} />
        </Form.Group>
      );
    }

    if (field.type === 'textarea') {
      return (
        <Form.Group controlId={`student-portal-${field.name}`}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Control
            as="textarea"
            rows={field.rows || 3}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={value}
            onChange={(event) => handleFieldChange(field.name, event.target.value)}
          />
        </Form.Group>
      );
    }

    const isGraduationDate = field.name === 'graduation_date';
    const isEmploymentField =
      field.name === 'employment_company' || field.name === 'employment_role';
    const isPhoneField = field.name === 'phone' || field.name === 'emergency_contact';

    const inputProps = {
      type: field.type || 'text',
      placeholder: `Enter ${field.label.toLowerCase()}`,
      value: value,
      onChange: (event) => handleFieldChange(field.name, event.target.value)
    };

    if (isGraduationDate) {
      inputProps.type = 'date';
      inputProps.disabled = !graduationComplete;
    }

    if (isEmploymentField) {
      inputProps.placeholder =
        field.name === 'employment_company'
          ? 'Where are you working?'
          : 'What is your role or title?';
      inputProps.disabled = !workingPlan;
    }

    if (isPhoneField) {
      inputProps.type = 'tel';
    }

    return (
      <Form.Group controlId={`student-portal-${field.name}`}>
        <Form.Label>{field.label}</Form.Label>
        <Form.Control {...inputProps} />
        {isGraduationDate && !graduationComplete && (
          <Form.Text className="text-muted small">
            Toggle &quot;Graduation Completed&quot; to set a completion date.
          </Form.Text>
        )}
        {isEmploymentField && !workingPlan && (
          <Form.Text className="text-muted small">
            Select &quot;Working&quot; as your plan to add company and role details.
          </Form.Text>
        )}
      </Form.Group>
    );
  };

  return (
    <>
      <Head>
        <title>Student Portal | HSAPSS Windsor</title>
      </Head>
      <main className="main-content py-5">
        <div className="container">
          <Card className="shadow border-0 student-portal-card">
            <Card.Header className="bg-primary text-white py-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <h5 className="mb-1">
                    <i className="fas fa-user-graduate me-2"></i>
                    HSAPSS Windsor Youths Portal
                  </h5>
                  <p className="mb-0 small text-white-50">
                    {student
                      ? 'Review your profile information and keep it up to date for HSAPSS communications.'
                      : 'Log in with your registered phone number and the shared password to manage your HSAPSS profile.'}
                  </p>
                </div>
                {student && (
                  <Button variant="outline-light" size="sm" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Log Out
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body className="p-4 p-md-5">
              {errorMessage && (
                <Alert variant="danger" className="mb-4">
                  {errorMessage}
                </Alert>
              )}
              {successMessage && (
                <Alert variant="success" className="mb-4">
                  {successMessage}
                </Alert>
              )}
              {!student ? (
                <Form onSubmit={handleLogin} className="student-portal-form" autoComplete="off">
                  <div className="row g-4">
                    <div className="col-12 col-md-6">
                      <Form.Group controlId="student-portal-login-phone">
                        <Form.Label>Phone Number</Form.Label>
                        <Form.Control
                          type="tel"
                          placeholder="Enter your phone number"
                          value={loginPhone}
                          onChange={(event) => setLoginPhone(event.target.value)}
                          required
                        />
                      </Form.Group>
                    </div>
                    <div className="col-12 col-md-6">
                      <Form.Group controlId="student-portal-login-password">
                        <Form.Label>Shared Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Enter the shared password"
                          value={loginPassword}
                          onChange={(event) => setLoginPassword(event.target.value)}
                          required
                        />
                        <Form.Text className="text-muted small d-block mt-2">
                          {passwordHint}
                        </Form.Text>
                      </Form.Group>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end mt-4">
                    <Button type="submit" variant="primary" disabled={loginLoading}>
                      {loginLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" role="status" />
                          Logging In...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sign-in-alt me-2"></i>
                          Log In
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              ) : (
                <Form onSubmit={handleUpdate} className="student-portal-form" noValidate>
                  <div className="portal-sections">
                    {portalSections.map((section) => (
                      <section key={section.key} className="portal-section">
                        <div className="portal-section-header">
                          <span className="portal-section-icon">
                            <i className={section.icon}></i>
                          </span>
                          <div>
                            <h6 className="portal-section-title mb-1">{section.title}</h6>
                            <p className="portal-section-subtitle mb-0 text-muted">{section.subtitle}</p>
                          </div>
                        </div>
                        <div className="row g-4">
                          {section.fields.map((fieldName) => {
                            if (
                              !workingPlan &&
                              (fieldName === 'employment_company' || fieldName === 'employment_role')
                            ) {
                              return null;
                            }
                            const fieldConfig = FIELD_CONFIG_MAP.get(fieldName);
                            if (!fieldConfig) {
                              return null;
                            }
                            return (
                              <div key={fieldName} className={getFieldColumnClass(fieldConfig)}>
                                {renderFormControl(fieldConfig)}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                  <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mt-4">
                    <p className="text-muted small mb-0">
                      Need help? Contact your HSAPSS coordinator to change anything you cannot update here.
                    </p>
                    <Button type="submit" variant="primary" disabled={updateLoading}>
                      {updateLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" role="status" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Save My Details
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </div>
      </main>
      <style jsx>{`
        .main-content {
          min-height: calc(100vh - 72px);
          background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 45%),
            radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.08), transparent 45%),
            linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
        }
        .student-portal-card {
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(15, 23, 42, 0.12);
          border: none;
        }
        .student-portal-card .card-header {
          position: relative;
          background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%);
          border: none;
        }
        .student-portal-card .card-header::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.28), transparent 55%);
          pointer-events: none;
        }
        .student-portal-card .card-body {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        .portal-sections {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .portal-section {
          background: #ffffff;
          border-radius: 1.25rem;
          border: 1px solid rgba(148, 163, 184, 0.16);
          padding: 1.75rem;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .portal-section:hover {
          transform: translateY(-4px);
          box-shadow: 0 30px 60px rgba(15, 23, 42, 0.08);
        }
        .portal-section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .portal-section-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb 0%, #38bdf8 100%);
          color: #ffffff;
          font-size: 1.25rem;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.25);
        }
        .portal-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.01em;
        }
        .portal-section-subtitle {
          font-size: 0.9rem;
        }
        .student-portal-form .form-label {
          font-weight: 600;
          color: #1f2937;
        }
        .student-portal-form .form-control,
        .student-portal-form .form-select {
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          background-color: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.35);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .student-portal-form .form-control[readonly] {
          background-color: #f1f5f9;
          border-style: dashed;
          cursor: default;
        }
        .student-portal-form .form-control:focus,
        .student-portal-form .form-select:focus {
          box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.15);
          border-color: #2563eb;
          background-color: #ffffff;
        }
        .student-portal-form .form-select:disabled,
        .student-portal-form .form-control:disabled {
          background-color: #edf2f7;
          cursor: not-allowed;
        }
        .student-portal-form .form-check-input {
          width: 3rem;
          height: 1.5rem;
          border-radius: 1.5rem;
          border: 1px solid rgba(37, 99, 235, 0.4);
          background-color: rgba(148, 163, 184, 0.3);
        }
        .student-portal-form .form-check-input:checked {
          background-color: #2563eb;
        }
        .student-portal-form .form-check-input:focus {
          box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.2);
        }
        .student-portal-form .form-check-label {
          font-weight: 600;
          color: #1f2937;
        }
        @media (max-width: 767px) {
          .student-portal-card {
            border-radius: 1.25rem;
          }
          .portal-section {
            padding: 1.3rem;
          }
          .portal-section-header {
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}
