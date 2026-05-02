// Default data source registrations. Add a new built-in source = new file
// under sources/ + one register(...) line below. No other file changes —
// invariant enforced by src/__tests__/extensibility.test.tsx.

import { register } from "@/data-sources/registry";
import { ActionPropertiesSource } from "@/data-sources/sources/action-properties";
import { ClientOrgPropertiesSource } from "@/data-sources/sources/client-org-properties";
import { DirectFormSource } from "@/data-sources/sources/direct-form";
import { TransitiveFormSource } from "@/data-sources/sources/transitive-form";

register(ActionPropertiesSource);
register(ClientOrgPropertiesSource);
register(DirectFormSource);
register(TransitiveFormSource);
