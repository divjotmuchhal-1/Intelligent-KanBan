export type UserProfile = {
    user_id: string;
    username: string;
    title?: string | null;
    timezone?: string | null;
    skills?: string[] | null;
    capacity_hours_per_week?: number | null;
  };
  
  export type Recommendation = {
    id: string;
    sprint_id: string;
    task_id: string;
    task_title: string;
    recommended_user_id: string;
    recommended_username: string;
    suggested_hours?: number | null;
    score?: number | null;       // 0..1
    rationale?: string | null;
    accepted?: boolean | null;   // null=pending
  };
  