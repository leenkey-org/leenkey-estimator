"use client";

import { useState } from "react";
import { FilterMenu, type FilterMenuOption } from "@/components/shared/filter-menu";

/** A part of the rounded search bar in the /design catalogue, its value following the choice. */
export function FilterMenuDemo({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: readonly FilterMenuOption[];
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const option = options.find((item) => item.value === value) ?? options[0];
  return (
    <FilterMenu
      label={label}
      value={value}
      display={option?.label ?? ""}
      options={options}
      onValueChange={setValue}
    />
  );
}
