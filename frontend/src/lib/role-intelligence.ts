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
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'Proposer':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    case 'Seconder':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-300';
    case 'Campaigner':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-300';
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
      return `Campaigner - ${role.post}`;
    default:
      return `${role.role_type} - ${role.post}`;
  }
};

export const formatRiskTone = (riskLevel: string) => {
  switch (riskLevel) {
    case 'HIGH':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'MEDIUM':
      return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
    default:
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
};
