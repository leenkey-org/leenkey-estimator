"use client";

import { useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";

export type FilterSelectDemoOption = {
  value: string;
  label: string;
  /** Text shown in the field when chosen, when shorter than the option. */
  display?: string;
};

/** FilterSelect of the /design catalogue, its text following the option chosen. */
export function FilterSelectDemo({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: readonly FilterSelectDemoOption[];
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const option = options.find((item) => item.value === value) ?? options[0];
  return (
    <FilterSelect
      label={label}
      display={option.display ?? option.label}
      active={value !== ""}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    >
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </FilterSelect>
  );
}
