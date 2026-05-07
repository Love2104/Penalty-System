export interface StudentRole {
  student_name?: string;
  role_type: 'Candidate' | 'Proposer' | 'Seconder' | 'Campaigner' | string;
  candidate_roll: string;
  candidate_name: string;
  post: string;
  group_id: number;
  election_year: number;
}

export interface ConflictInfo {
  election_year: number;
  candidate_rolls: string[];
  candidate_names: string[];
  group_ids: number[];
}

export interface StudentInfoResponse {
  profile: {
    name: string | null;
    roll: string;
    email: string | null;
    dept: string | null;
    hall: string | null;
    program: string | null;
    room: string | null;
    gender: string | null;
    hometown: string | null;
    image_url: string | null;
  };
  roles: StudentRole[];
  penalty_history: Array<{
    id: string;
    student_roll: string;
    clause: string;
    nature: string;
    remarks: string;
    sheet_id: string;
    sheet_name: string | null;
    timestamp: string;
  }>;
  risk_indicator: {
    total_penalties: number;
    repeat_offender: boolean;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  };
  has_conflict: boolean;
  conflicts: ConflictInfo[];
}

export const getRoleBadgeClasses = (roleType: string) => {
  switch (roleType) {
    case 'Candidate':
      return 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300';
    case 'Proposer':
      return 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    case 'Seconder':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'Campaigner':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    default:
      return 'border-[var(--line)] bg-white/70 text-[color:var(--foreground-muted)] dark:bg-white/5';
  }
};

export const buildRoleBadgeLabel = (role: StudentRole) => {
  switch (role.role_type) {
    case 'Candidate':
      return `Candidate - ${role.post}`;
    case 'Proposer':
      return `Proposer of ${role.candidate_name}`;
    case 'Seconder':
      return `Seconder of ${role.candidate_name}`;
    case 'Campaigner':
      return `Campaigner for ${role.candidate_name}`;
    default:
      return `${role.role_type} - ${role.post}`;
  }
};

export const formatRiskTone = (riskLevel: string) => {
  switch (riskLevel) {
    case 'HIGH':
      return 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300';
    case 'MEDIUM':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    default:
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
};
