export type Sprint = {
    id: string;
    name: string;
    goals?: string | null;
    definition_of_done?: string | null;
    start_date: string;     // ISO date: "2025-08-21"
    end_date: string;       // ISO date
    velocity_target?: number | null;
    constraints?: Record<string, unknown> | null;
  };
  
  export type SprintMember = {
    sprint_id: string;
    user_id: string;
    role_in_sprint?: "member" | "lead";
    capacity_hours?: number | null;
  };
  