'use client';

import { buildRoleBadgeLabel, getRoleBadgeClasses, StudentRole } from '@/lib/role-intelligence';

interface RoleBadgesProps {
  roles?: StudentRole[];
  maxVisible?: number;
}

export default function RoleBadges({ roles = [], maxVisible }: RoleBadgesProps) {
  if (!roles.length) {
    return <span className="text-xs muted">No election role mapped</span>;
  }

  const visibleRoles = typeof maxVisible === 'number' ? roles.slice(0, maxVisible) : roles;
  const hiddenCount = roles.length - visibleRoles.length;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleRoles.map((role, index) => (
        <span
          key={`${role.role_type}-${role.candidate_roll}-${role.group_id}-${role.election_year}-${index}`}
          className={`status-pill ${getRoleBadgeClasses(role.role_type)}`}
          title={`${role.role_type} | ${role.candidate_name} | ${role.post} | ${role.election_year}`}
        >
          {buildRoleBadgeLabel(role)}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="status-pill border-[var(--line)] bg-white/60 text-[color:var(--foreground-muted)] dark:bg-white/5">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
