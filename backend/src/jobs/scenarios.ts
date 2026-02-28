// Medical scenario definitions for synthetic conversation generation

export interface Scenario {
  specialty: string;
  subSpecialty?: string;
  title: string;
  scenarioType: 'consultation' | 'second_opinion' | 'urgent' | 'follow_up';
  patientDemographics: {
    ageRange: string;
    sex?: string;
    relevantHistory?: string[];
  };
  conditions: string[];
  keyTopics: string[];
  complexity: 'basic' | 'intermediate' | 'advanced';
  guidelinesReferenced: string[];
  participants: {
    role: string;
    specialty: string;
    subSpecialty?: string;
  }[];
}

export const SCENARIOS: Scenario[] = [
  // CARDIOLOGY
  {
    specialty: 'Cardiology',
    subSpecialty: 'Electrophysiology',
    title: 'New Atrial Fibrillation Management in Diabetic Patient',
    scenarioType: 'consultation',
    patientDemographics: {
      ageRange: '60-70',
      sex: 'male',
      relevantHistory: ['type 2 diabetes', 'hypertension', 'obesity'],
    },
    conditions: ['atrial_fibrillation', 'type2_diabetes', 'hypertension'],
    keyTopics: ['CHA2DS2-VASc', 'anticoagulation', 'rate_control', 'DOAC_selection'],
    complexity: 'intermediate',
    guidelinesReferenced: ['ACC/AHA 2023 AFib Guidelines', 'RACE II Trial'],
    participants: [
      { role: 'General Practitioner', specialty: 'Family Medicine' },
      { role: 'Cardiologist', specialty: 'Cardiology', subSpecialty: 'Electrophysiology' },
    ],
  },
  {
    specialty: 'Cardiology',
    title: 'Heart Failure Medication Optimization',
    scenarioType: 'follow_up',
    patientDemographics: {
      ageRange: '70-80',
      sex: 'female',
      relevantHistory: ['CHF', 'CKD stage 3', 'history of MI'],
    },
    conditions: ['heart_failure', 'chronic_kidney_disease', 'coronary_artery_disease'],
    keyTopics: ['GDMT', 'SGLT2_inhibitors', 'ACE_inhibitors', 'beta_blockers', 'diuretics'],
    complexity: 'advanced',
    guidelinesReferenced: ['ACC/AHA 2022 HF Guidelines', 'EMPEROR-Reduced Trial'],
    participants: [
      { role: 'Internal Medicine', specialty: 'Internal Medicine' },
      { role: 'Cardiologist', specialty: 'Cardiology', subSpecialty: 'Heart Failure' },
    ],
  },

  // ENDOCRINOLOGY
  {
    specialty: 'Endocrinology',
    title: 'Type 2 Diabetes with Poor Glycemic Control',
    scenarioType: 'consultation',
    patientDemographics: {
      ageRange: '50-60',
      sex: 'male',
      relevantHistory: ['type 2 diabetes', 'obesity', 'hypertension'],
    },
    conditions: ['type2_diabetes', 'obesity', 'metabolic_syndrome'],
    keyTopics: ['HbA1c_targets', 'GLP1_agonists', 'SGLT2_inhibitors', 'insulin_initiation'],
    complexity: 'intermediate',
    guidelinesReferenced: ['ADA 2024 Standards of Care', 'AACE Guidelines'],
    participants: [
      { role: 'General Practitioner', specialty: 'Family Medicine' },
      { role: 'Endocrinologist', specialty: 'Endocrinology' },
    ],
  },
  {
    specialty: 'Endocrinology',
    title: 'Thyroid Nodule Evaluation',
    scenarioType: 'consultation',
    patientDemographics: {
      ageRange: '40-50',
      sex: 'female',
      relevantHistory: ['incidental thyroid nodule on imaging'],
    },
    conditions: ['thyroid_nodule'],
    keyTopics: ['TI-RADS', 'FNA_biopsy', 'thyroid_function', 'malignancy_risk'],
    complexity: 'intermediate',
    guidelinesReferenced: ['ATA 2015 Thyroid Nodule Guidelines', 'ACR TI-RADS'],
    participants: [
      { role: 'Internal Medicine', specialty: 'Internal Medicine' },
      { role: 'Endocrinologist', specialty: 'Endocrinology' },
    ],
  },

  // NEUROLOGY
  {
    specialty: 'Neurology',
    title: 'New Onset Seizure in Adult',
    scenarioType: 'urgent',
    patientDemographics: {
      ageRange: '30-40',
      sex: 'male',
      relevantHistory: ['first seizure', 'no prior neurological history'],
    },
    conditions: ['seizure', 'epilepsy'],
    keyTopics: ['seizure_workup', 'EEG', 'MRI_brain', 'antiepileptic_selection', 'driving_restrictions'],
    complexity: 'intermediate',
    guidelinesReferenced: ['AAN Epilepsy Guidelines', 'ILAE Classification'],
    participants: [
      { role: 'Emergency Physician', specialty: 'Emergency Medicine' },
      { role: 'Neurologist', specialty: 'Neurology', subSpecialty: 'Epilepsy' },
    ],
  },
  {
    specialty: 'Neurology',
    title: 'Migraine Refractory to Standard Treatment',
    scenarioType: 'consultation',
    patientDemographics: {
      ageRange: '25-35',
      sex: 'female',
      relevantHistory: ['chronic migraine', 'medication overuse'],
    },
    conditions: ['chronic_migraine', 'medication_overuse_headache'],
    keyTopics: ['CGRP_inhibitors', 'preventive_therapy', 'medication_overuse', 'botox'],
    complexity: 'intermediate',
    guidelinesReferenced: ['AAN Migraine Prevention Guidelines', 'AHS Guidelines'],
    participants: [
      { role: 'General Practitioner', specialty: 'Family Medicine' },
      { role: 'Neurologist', specialty: 'Neurology', subSpecialty: 'Headache Medicine' },
    ],
  },

  // PULMONOLOGY
  {
    specialty: 'Pulmonology',
    title: 'COPD Exacerbation Management',
    scenarioType: 'urgent',
    patientDemographics: {
      ageRange: '65-75',
      sex: 'male',
      relevantHistory: ['COPD GOLD stage 3', 'current smoker', 'previous exacerbations'],
    },
    conditions: ['COPD', 'acute_exacerbation'],
    keyTopics: ['bronchodilators', 'steroids', 'antibiotics', 'oxygen_therapy', 'NIV'],
    complexity: 'intermediate',
    guidelinesReferenced: ['GOLD 2024 Guidelines', 'ATS/ERS Guidelines'],
    participants: [
      { role: 'Hospitalist', specialty: 'Hospital Medicine' },
      { role: 'Pulmonologist', specialty: 'Pulmonology' },
    ],
  },

  // INFECTIOUS DISEASE
  {
    specialty: 'Infectious Disease',
    title: 'Complicated UTI with Antibiotic Resistance',
    scenarioType: 'consultation',
    patientDemographics: {
      ageRange: '70-80',
      sex: 'female',
      relevantHistory: ['recurrent UTIs', 'recent antibiotic use', 'diabetes'],
    },
    conditions: ['complicated_UTI', 'ESBL_infection'],
    keyTopics: ['antibiotic_resistance', 'ESBL', 'carbapenem_sparing', 'urine_culture'],
    complexity: 'advanced',
    guidelinesReferenced: ['IDSA UTI Guidelines', 'CDC Antibiotic Resistance Threats'],
    participants: [
      { role: 'Internal Medicine', specialty: 'Internal Medicine' },
      { role: 'Infectious Disease Specialist', specialty: 'Infectious Disease' },
    ],
  },

  // GASTROENTEROLOGY
  {
    specialty: 'Gastroenterology',
    title: 'Elevated Liver Enzymes Workup',
    scenarioType: 'consultation',
    patientDemographics: {
      ageRange: '45-55',
      sex: 'male',
      relevantHistory: ['obesity', 'metabolic syndrome', 'incidental finding'],
    },
    conditions: ['elevated_transaminases', 'NAFLD', 'metabolic_dysfunction'],
    keyTopics: ['NAFLD', 'NASH', 'fibrosis_staging', 'FIB4', 'liver_biopsy'],
    complexity: 'intermediate',
    guidelinesReferenced: ['AASLD NAFLD Guidelines', 'ACG Guidelines'],
    participants: [
      { role: 'General Practitioner', specialty: 'Family Medicine' },
      { role: 'Gastroenterologist', specialty: 'Gastroenterology', subSpecialty: 'Hepatology' },
    ],
  },

  // RHEUMATOLOGY
  {
    specialty: 'Rheumatology',
    title: 'New Rheumatoid Arthritis Diagnosis and Treatment',
    scenarioType: 'consultation',
    patientDemographics: {
      ageRange: '35-45',
      sex: 'female',
      relevantHistory: ['joint pain', 'morning stiffness', 'positive RF and anti-CCP'],
    },
    conditions: ['rheumatoid_arthritis'],
    keyTopics: ['DMARD_initiation', 'methotrexate', 'biologics', 'treat_to_target'],
    complexity: 'intermediate',
    guidelinesReferenced: ['ACR 2021 RA Guidelines', 'EULAR Recommendations'],
    participants: [
      { role: 'General Practitioner', specialty: 'Family Medicine' },
      { role: 'Rheumatologist', specialty: 'Rheumatology' },
    ],
  },
];

// Synthetic expert names for generating conversations
export const SYNTHETIC_EXPERTS: Record<string, { names: string[]; credentials: string; institutions: string[] }> = {
  'Cardiology': {
    names: ['Sarah Chen', 'Michael Roberts', 'Emily Johnson', 'David Kim'],
    credentials: 'MD, FACC',
    institutions: ['Cleveland Clinic', 'Mayo Clinic', 'Johns Hopkins', 'Mass General'],
  },
  'Electrophysiology': {
    names: ['James Wilson', 'Lisa Park', 'Robert Thompson'],
    credentials: 'MD, FHRS',
    institutions: ['Cleveland Clinic', 'Duke University', 'Stanford'],
  },
  'Endocrinology': {
    names: ['Jennifer Martinez', 'Andrew Lee', 'Rachel Green'],
    credentials: 'MD, FACE',
    institutions: ['UCSF', 'Northwestern', 'UCLA'],
  },
  'Neurology': {
    names: ['Christopher Brown', 'Amanda White', 'Daniel Garcia'],
    credentials: 'MD, FAAN',
    institutions: ['Mayo Clinic', 'UCSF', 'Johns Hopkins'],
  },
  'Pulmonology': {
    names: ['William Davis', 'Michelle Taylor', 'Steven Anderson'],
    credentials: 'MD, FCCP',
    institutions: ['National Jewish Health', 'UCSF', 'University of Colorado'],
  },
  'Infectious Disease': {
    names: ['Patricia Moore', 'Kevin Jackson', 'Laura Martinez'],
    credentials: 'MD, FIDSA',
    institutions: ['CDC', 'Johns Hopkins', 'Emory'],
  },
  'Gastroenterology': {
    names: ['Thomas Wilson', 'Karen Lee', 'Mark Johnson'],
    credentials: 'MD, FACG',
    institutions: ['Mayo Clinic', 'Mount Sinai', 'University of Chicago'],
  },
  'Rheumatology': {
    names: ['Elizabeth Brown', 'Joseph Kim', 'Susan Clark'],
    credentials: 'MD, FACR',
    institutions: ['Hospital for Special Surgery', 'UCSF', 'Stanford'],
  },
  'Family Medicine': {
    names: ['John Smith', 'Mary Johnson', 'Robert Williams', 'Patricia Davis'],
    credentials: 'MD, FAAFP',
    institutions: ['Community Health Center', 'Primary Care Associates', 'Family Medicine Clinic'],
  },
  'Internal Medicine': {
    names: ['James Miller', 'Linda Wilson', 'Richard Moore'],
    credentials: 'MD, FACP',
    institutions: ['University Hospital', 'Academic Medical Center', 'General Hospital'],
  },
  'Emergency Medicine': {
    names: ['Brian Thompson', 'Jennifer Adams', 'Michael Chen'],
    credentials: 'MD, FACEP',
    institutions: ['Level 1 Trauma Center', 'University ER', 'Metro Emergency'],
  },
  'Hospital Medicine': {
    names: ['David Lee', 'Sarah Martinez', 'Christopher Taylor'],
    credentials: 'MD, SFHM',
    institutions: ['Academic Medical Center', 'Community Hospital', 'University Hospital'],
  },
};

export function getRandomExpert(specialty: string): { name: string; credentials: string; institution: string } {
  const expertPool = SYNTHETIC_EXPERTS[specialty] || SYNTHETIC_EXPERTS['Internal Medicine'];
  const name = expertPool.names[Math.floor(Math.random() * expertPool.names.length)];
  const institution = expertPool.institutions[Math.floor(Math.random() * expertPool.institutions.length)];
  return {
    name: `Dr. ${name}`,
    credentials: expertPool.credentials,
    institution,
  };
}
