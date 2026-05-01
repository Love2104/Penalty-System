'use client';

import { buildRoleBadgeLabel, getRoleBadgeClasses, StudentRole } from '@/lib/role-intelligence';

interface RoleBadgesProps {
  roles?: StudentRole[];
  maxVisible?: number;
}

export default function RoleBadges({ roles = [], maxVisible }: RoleBadgesProps) {
  if (roles.length === 0) {
    return <span className="text-xs text-zinc-500">No election role</span>;
  }

  const visibleRoles = typeof maxVisible === 'number' ? roles.slice(0, maxVisible) : roles;
  const hiddenCount = roles.length - visibleRoles.length;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleRoles.map((role, index) => (
        <span
          key={`${role.role_type}-${role.candidate_roll}-${role.group_id}-${role.election_year}-${index}`}
          title={`${role.role_type} | ${role.candidate_name} | ${role.post} | ${role.election_year}`}
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getRoleBadgeClasses(role.role_type)}`}
        >
          {buildRoleBadgeLabel(role)}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
