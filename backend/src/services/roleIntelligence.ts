import prisma from '../lib/prisma';

export const ROLE_TYPES = ['Candidate', 'Proposer', 'Seconder', 'Campaigner'] as const;

type RoleType = (typeof ROLE_TYPES)[number];

export interface ParsedRoleGroup {
  group_id: number;
  post: string;
  candidate: {
    roll: string;
    name: string;
  };
  members: Array<{
    roll: string;
    name: string;
    role: Exclude<RoleType, 'Candidate'>;
  }>;
}

interface RoleSummary {
  student_name: string;
  role_type: RoleType;
  candidate_roll: string;
  candidate_name: string;
  post: string;
  group_id: number;
  election_year: number;
}

interface ConflictSummary {
  election_year: number;
  candidate_rolls: string[];
  candidate_names: string[];
  group_ids: number[];
}

const normalizeText = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmed;
};

const normalizeMaybeBlankText = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`);
  }

  return value.trim();
};

const isPlaceholderValue = (value: unknown) => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toUpperCase();
  return ['...', 'ROLL', 'ROLL NUMBER', 'NAME', 'ROLE'].includes(normalized);
};

const normalizeRoleType = (value: unknown): Exclude<RoleType, 'Candidate'> => {
  const raw = normalizeText(value, 'member.role').toLowerCase();
  const roleMap: Record<string, Exclude<RoleType, 'Candidate'>> = {
    proposer: 'Proposer',
    seconder: 'Seconder',
    campaigner: 'Campaigner',
  };

  const normalized = roleMap[raw];
  if (!normalized) {
    throw new Error(`Unsupported member role "${value}". Allowed roles: Proposer, Seconder, Campaigner.`);
  }

  return normalized;
};

export const parseElectionYear = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return new Date().getFullYear();
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 3000) {
    throw new Error('election_year must be a valid four-digit year.');
  }

  return parsed;
};

export const parseBooleanFlag = (value: unknown, defaultValue: boolean) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  throw new Error('Boolean flag must be true or false.');
};

export const validateRoleUploadPayload = (payload: unknown): ParsedRoleGroup[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Uploaded JSON must be an array of role groups.');
  }

  return payload.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Entry at index ${index} must be an object.`);
    }

    const raw = item as Record<string, unknown>;
    if (!Number.isInteger(raw.group_id)) {
      throw new Error(`group_id at index ${index} must be an integer.`);
    }

    const post = normalizeText(raw.post, `post at index ${index}`);

    if (!raw.candidate || typeof raw.candidate !== 'object' || Array.isArray(raw.candidate)) {
      throw new Error(`candidate at index ${index} must be an object.`);
    }

    const candidate = raw.candidate as Record<string, unknown>;
    const candidateRoll = normalizeText(candidate.roll, `candidate.roll at index ${index}`);
    const candidateName = normalizeMaybeBlankText(candidate.name, `candidate.name at index ${index}`);

    if (!Array.isArray(raw.members)) {
      throw new Error(`members at index ${index} must be an array.`);
    }

    const members = raw.members.flatMap((member, memberIndex) => {
      if (!member || typeof member !== 'object' || Array.isArray(member)) {
        throw new Error(`members[${memberIndex}] at index ${index} must be an object.`);
      }

      const memberRecord = member as Record<string, unknown>;
      if (
        isPlaceholderValue(memberRecord.roll) &&
        isPlaceholderValue(memberRecord.name) &&
        isPlaceholderValue(memberRecord.role)
      ) {
        return [];
      }

      return [{
        roll: normalizeText(memberRecord.roll, `members[${memberIndex}].roll at index ${index}`),
        name: normalizeMaybeBlankText(memberRecord.name, `members[${memberIndex}].name at index ${index}`),
        role: normalizeRoleType(memberRecord.role),
      }];
    });

    return {
      group_id: raw.group_id as number,
      post,
      candidate: {
        roll: candidateRoll,
        name: candidateName,
      },
      members,
    };
  });
};

export const hydrateMissingStudentNames = async (groups: ParsedRoleGroup[]) => {
  const missingRolls = new Set<string>();

  for (const group of groups) {
    if (!group.candidate.name) {
      missingRolls.add(group.candidate.roll);
    }

    for (const member of group.members) {
      if (!member.name) {
        missingRolls.add(member.roll);
      }
    }
  }

  if (missingRolls.size === 0) {
    return groups;
  }

  const students = await prisma.student.findMany({
    where: {
      roll: {
        in: [...missingRolls],
      },
    },
    select: {
      roll: true,
      name: true,
    },
  });

  const studentMap = new Map(students.map((student) => [student.roll, student.name]));

  const hydratedGroups = groups.map((group) => ({
    ...group,
    candidate: {
      ...group.candidate,
      name: group.candidate.name || studentMap.get(group.candidate.roll) || '',
    },
    members: group.members.map((member) => ({
      ...member,
      name: member.name || studentMap.get(member.roll) || '',
    })),
  }));

  const unresolved = hydratedGroups.flatMap((group, groupIndex) => {
    const issues: string[] = [];
    if (!group.candidate.name) {
      issues.push(`candidate.name at index ${groupIndex} could not be resolved for roll ${group.candidate.roll}`);
    }

    group.members.forEach((member, memberIndex) => {
      if (!member.name) {
        issues.push(`members[${memberIndex}].name at index ${groupIndex} could not be resolved for roll ${member.roll}`);
      }
    });

    return issues;
  });

  if (unresolved.length > 0) {
    throw new Error(unresolved[0]);
  }

  return hydratedGroups;
};

const buildRoleRows = (groups: ParsedRoleGroup[], electionYear: number) => {
  const dedupe = new Set<string>();
  const rows: Array<{
    student_roll: string;
    student_name: string;
    role_type: RoleType;
    candidate_roll: string;
    candidate_name: string;
    post: string;
    group_id: number;
    election_year: number;
  }> = [];

  const pushRow = (row: {
    student_roll: string;
    student_name: string;
    role_type: RoleType;
    candidate_roll: string;
    candidate_name: string;
    post: string;
    group_id: number;
    election_year: number;
  }) => {
    const key = [
      row.student_roll,
      row.role_type,
      row.candidate_roll,
      row.group_id,
      row.post.toLowerCase(),
      row.election_year,
    ].join('|');

    if (dedupe.has(key)) return;
    dedupe.add(key);
    rows.push(row);
  };

  for (const group of groups) {
    pushRow({
      student_roll: group.candidate.roll,
      student_name: group.candidate.name,
      role_type: 'Candidate',
      candidate_roll: group.candidate.roll,
      candidate_name: group.candidate.name,
      post: group.post,
      group_id: group.group_id,
      election_year: electionYear,
    });

    for (const member of group.members) {
      pushRow({
        student_roll: member.roll,
        student_name: member.name,
        role_type: member.role,
        candidate_roll: group.candidate.roll,
        candidate_name: group.candidate.name,
        post: group.post,
        group_id: group.group_id,
        election_year: electionYear,
      });
    }
  }

  return rows;
};

const buildConflictSummaries = (
  roles: RoleSummary[]
): { hasConflict: boolean; conflicts: ConflictSummary[] } => {
  const byYear = new Map<number, Map<string, { candidate_roll: string; candidate_name: string; group_id: number }>>();

  for (const role of roles) {
    const yearMap = byYear.get(role.election_year) || new Map();
    const key = `${role.group_id}|${role.candidate_roll}`;
    if (!yearMap.has(key)) {
      yearMap.set(key, {
        candidate_roll: role.candidate_roll,
        candidate_name: role.candidate_name,
        group_id: role.group_id,
      });
    }
    byYear.set(role.election_year, yearMap);
  }

  const conflicts: ConflictSummary[] = [];
  for (const [electionYear, memberships] of byYear.entries()) {
    if (memberships.size <= 1) continue;

    const values = [...memberships.values()];
    conflicts.push({
      election_year: electionYear,
      candidate_rolls: values.map((value) => value.candidate_roll),
      candidate_names: values.map((value) => value.candidate_name),
      group_ids: values.map((value) => value.group_id),
    });
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
};

export const getStudentRoleInsights = async (rolls: string[]) => {
  const uniqueRolls = [...new Set(rolls.filter(Boolean))];
  const roleMap = new Map<string, RoleSummary[]>();
  const conflictMap = new Map<string, boolean>();
  const conflictDetailsMap = new Map<string, ConflictSummary[]>();

  if (uniqueRolls.length === 0) {
    return { roleMap, conflictMap, conflictDetailsMap };
  }

  const roleMappings = await prisma.roleMapping.findMany({
    where: {
      student_roll: { in: uniqueRolls },
    },
    orderBy: [{ election_year: 'desc' }, { created_at: 'asc' }],
  });

  for (const mapping of roleMappings) {
    const existing = roleMap.get(mapping.student_roll) || [];
    existing.push({
      student_name: mapping.student_name,
      role_type: mapping.role_type as RoleType,
      candidate_roll: mapping.candidate_roll,
      candidate_name: mapping.candidate_name,
      post: mapping.post,
      group_id: mapping.group_id,
      election_year: mapping.election_year,
    });
    roleMap.set(mapping.student_roll, existing);
  }

  for (const roll of uniqueRolls) {
    const roles = roleMap.get(roll) || [];
    const conflictSummary = buildConflictSummaries(roles);
    conflictMap.set(roll, conflictSummary.hasConflict);
    conflictDetailsMap.set(roll, conflictSummary.conflicts);
  }

  return { roleMap, conflictMap, conflictDetailsMap };
};

export const getPenaltyCountsByRolls = async (rolls: string[]) => {
  const uniqueRolls = [...new Set(rolls.filter(Boolean))];
  const counts = new Map<string, number>();

  if (uniqueRolls.length === 0) return counts;

  const grouped = await prisma.penaltyRow.groupBy({
    by: ['roll_no'],
    where: { roll_no: { in: uniqueRolls } },
    _count: { roll_no: true },
  });

  for (const row of grouped) {
    counts.set(row.roll_no, row._count.roll_no);
  }

  return counts;
};

export const buildRiskIndicator = (totalPenalties: number) => ({
  total_penalties: totalPenalties,
  repeat_offender: totalPenalties >= 2,
  level: totalPenalties >= 4 ? 'HIGH' : totalPenalties >= 2 ? 'MEDIUM' : 'LOW',
});

export const uploadRoleMappings = async (
  groups: ParsedRoleGroup[],
  electionYear: number,
  replaceExisting: boolean
) => {
  const rows = buildRoleRows(groups, electionYear);
  const chunkSize = 1000;

  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      await tx.roleMapping.deleteMany({
        where: { election_year: electionYear },
      });
    }

    for (let index = 0; index < rows.length; index += chunkSize) {
      await tx.roleMapping.createMany({
        data: rows.slice(index, index + chunkSize),
      });
    }
  });

  const studentToRoles = new Map<string, RoleSummary[]>();
  for (const row of rows) {
    const existing = studentToRoles.get(row.student_roll) || [];
    existing.push({
      student_name: row.student_name,
      role_type: row.role_type,
      candidate_roll: row.candidate_roll,
      candidate_name: row.candidate_name,
      post: row.post,
      group_id: row.group_id,
      election_year: row.election_year,
    });
    studentToRoles.set(row.student_roll, existing);
  }

  const conflicts = [...studentToRoles.entries()]
    .map(([student_roll, roles]) => {
      const summary = buildConflictSummaries(roles);
      if (!summary.hasConflict) return null;

      return {
        student_roll,
        student_name: rows.find((row) => row.student_roll === student_roll)?.student_name || null,
        conflicts: summary.conflicts,
      };
    })
    .filter(Boolean);

  return {
    groupsProcessed: groups.length,
    mappingsCreated: rows.length,
    conflictsDetected: conflicts.length,
    conflicts,
  };
};

export const getStudentRoleInfo = async (roll: string) => {
  const student = await prisma.student.findUnique({
    where: { roll },
  });

  const { roleMap, conflictMap, conflictDetailsMap } = await getStudentRoleInsights([roll]);
  const roles = roleMap.get(roll) || [];
  const penaltiesCount = (await getPenaltyCountsByRolls([roll])).get(roll) || 0;

  if (!student && roles.length === 0 && penaltiesCount === 0) {
    return null;
  }

  const fallbackName = roles[0]?.student_name || null;

  return {
    name: student?.name || fallbackName || null,
    roll,
    email: student?.email || null,
    dept: student?.dept || null,
    hall: student?.hall || null,
    program: student?.program || null,
    roles,
    has_conflict: conflictMap.get(roll) || false,
    conflicts: conflictDetailsMap.get(roll) || [],
    risk_indicator: buildRiskIndicator(penaltiesCount),
  };
};

export const getStudentFullInfo = async (roll: string) => {
  const [student, penalties, roleInfo] = await Promise.all([
    prisma.student.findUnique({
      where: { roll },
    }),
    prisma.penaltyRow.findMany({
      where: { roll_no: roll },
      include: {
        sheet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    getStudentRoleInfo(roll),
  ]);

  if (!student && !roleInfo && penalties.length === 0) {
    return null;
  }

  const fallbackRoleName =
    roleInfo?.roles.find((role) => role.role_type === 'Candidate')?.candidate_name ||
    roleInfo?.name ||
    null;

  const penaltyHistory = penalties.map((penalty) => ({
    id: penalty.id,
    student_roll: penalty.roll_no,
    clause: penalty.clause,
    nature: penalty.nature,
    remarks: penalty.remarks,
    sheet_id: penalty.sheet_id,
    sheet_name: penalty.sheet?.name || null,
    timestamp: penalty.created_at,
  }));

  return {
    profile: {
      name: student?.name || fallbackRoleName,
      roll,
      email: student?.email || null,
      dept: student?.dept || null,
      hall: student?.hall || null,
      program: student?.program || null,
      room: student?.room || null,
      gender: student?.gender || null,
      hometown: student?.hometown || null,
      image_url: student?.image_url || null,
    },
    roles: roleInfo?.roles || [],
    penalty_history: penaltyHistory,
    risk_indicator: buildRiskIndicator(penaltyHistory.length),
    has_conflict: roleInfo?.has_conflict || false,
    conflicts: roleInfo?.conflicts || [],
  };
};
