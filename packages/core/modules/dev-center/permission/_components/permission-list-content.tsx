"use client";

import { SearchInput } from "@heiso/core/components/ui/search-input";
import { useState, useMemo } from "react";
import { PermissionCard, type PermissionGroup, type Permission } from "@heiso/core/components/primitives/permission-card";
import { Button } from "@heiso/core/components/ui/button";
import { ChevronsDownUp } from "lucide-react";

export function PermissionListContent({
    groups
}: {
    groups: PermissionGroup[]
}) {
    const [search, setSearch] = useState("");
    const [expansionVersion, setExpansionVersion] = useState({ version: 0, expanded: true });

    const filteredGroups = useMemo(() => {
        if (!search) return groups;

        return groups.map(group => ({
            ...group,
            permissions: group.permissions.filter((p: Permission) =>
                p.resource.toLowerCase().includes(search.toLowerCase()) ||
                p.action.toLowerCase().includes(search.toLowerCase())
            )
        })).filter(group => group.permissions.length > 0);
    }, [groups, search]);

    const collapseAll = () => setExpansionVersion(prev => ({ version: prev.version + 1, expanded: false }));

    return (
        <>
            <div className="flex items-center justify-end mb-4 gap-2">
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon_sm"
                        onClick={collapseAll}
                        title="全部收合"
                    >
                        <ChevronsDownUp className="size-4 text-muted-foreground" />
                    </Button>
                </div>
                <SearchInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search resource or action..."
                    className="w-[300px]"
                />
            </div>

            <div className="grow w-full overflow-y-auto grid grid-cols-1 gap-6 pb-10">
                {filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                        <PermissionCard
                            permissionGroup={group}
                            key={group.id}
                            expansionVersion={expansionVersion}
                        />
                    ))
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                        <p>No permissions found for "{search}"</p>
                    </div>
                )}
            </div>
        </>
    );
}
