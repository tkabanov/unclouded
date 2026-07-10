export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chatConversation: {
        Row: {
          createdAt: string
          id: string
          title: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          createdAt?: string
          id?: string
          title?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          createdAt?: string
          id?: string
          title?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: []
      }
      chatMessage: {
        Row: {
          content: string | null
          conversationId: string | null
          createdAt: string
          id: string
          isFromUser: boolean | null
          responseReceived: boolean | null
          sender: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          content?: string | null
          conversationId?: string | null
          createdAt?: string
          id?: string
          isFromUser?: boolean | null
          responseReceived?: boolean | null
          sender?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          content?: string | null
          conversationId?: string | null
          createdAt?: string
          id?: string
          isFromUser?: boolean | null
          responseReceived?: boolean | null
          sender?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatmessage_conversationId_fkey"
            columns: ["conversationId"]
            isOneToOne: false
            referencedRelation: "chatConversation"
            referencedColumns: ["id"]
          },
        ]
      }
      dailyCheckin: {
        Row: {
          createdAt: string
          date: string | null
          energyStressLevel: number | null
          id: string
          mood: number | null
          reflection: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          createdAt?: string
          date?: string | null
          energyStressLevel?: number | null
          id?: string
          mood?: number | null
          reflection?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          createdAt?: string
          date?: string | null
          energyStressLevel?: number | null
          id?: string
          mood?: number | null
          reflection?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: []
      }
      path: {
        Row: {
          aiCoachingMode: string | null
          classifications: string | null
          createdAt: string
          description: string | null
          id: string
          name: string | null
          pillar: string | null
          sessionsCount: number | null
          subMode: string | null
          tier: string | null
          triggerSignals: string | null
          updatedAt: string
        }
        Insert: {
          aiCoachingMode?: string | null
          classifications?: string | null
          createdAt?: string
          description?: string | null
          id?: string
          name?: string | null
          pillar?: string | null
          sessionsCount?: number | null
          subMode?: string | null
          tier?: string | null
          triggerSignals?: string | null
          updatedAt?: string
        }
        Update: {
          aiCoachingMode?: string | null
          classifications?: string | null
          createdAt?: string
          description?: string | null
          id?: string
          name?: string | null
          pillar?: string | null
          sessionsCount?: number | null
          subMode?: string | null
          tier?: string | null
          triggerSignals?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      pathEnrollment: {
        Row: {
          completedMicroCommitmentSessionIds: Json | null
          completedSessionsCount: number | null
          createdAt: string
          currentSessionId: string | null
          focusedMicroCommitmentSessionId: string | null
          id: string
          isMicroCommitmentInFocus: boolean | null
          pathId: string | null
          status: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          completedMicroCommitmentSessionIds?: Json | null
          completedSessionsCount?: number | null
          createdAt?: string
          currentSessionId?: string | null
          focusedMicroCommitmentSessionId?: string | null
          id?: string
          isMicroCommitmentInFocus?: boolean | null
          pathId?: string | null
          status?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          completedMicroCommitmentSessionIds?: Json | null
          completedSessionsCount?: number | null
          createdAt?: string
          currentSessionId?: string | null
          focusedMicroCommitmentSessionId?: string | null
          id?: string
          isMicroCommitmentInFocus?: boolean | null
          pathId?: string | null
          status?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathenrollment1_currentSessionId_fkey"
            columns: ["currentSessionId"]
            isOneToOne: false
            referencedRelation: "pathSession"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathenrollment1_focusedMicroCommitmentSessionId_fkey"
            columns: ["focusedMicroCommitmentSessionId"]
            isOneToOne: false
            referencedRelation: "pathSession"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathenrollment1_pathId_fkey"
            columns: ["pathId"]
            isOneToOne: false
            referencedRelation: "path"
            referencedColumns: ["id"]
          },
        ]
      }
      pathQuestion: {
        Row: {
          createdAt: string
          id: string
          index: number | null
          questionText: string | null
          sessionId: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id?: string
          index?: number | null
          questionText?: string | null
          sessionId?: string | null
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          id?: string
          index?: number | null
          questionText?: string | null
          sessionId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathquestion_sessionId_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "pathSession"
            referencedColumns: ["id"]
          },
        ]
      }
      pathSession: {
        Row: {
          coachingText: string | null
          createdAt: string
          estimatedMinutes: number | null
          id: string
          index: number | null
          microCommitment: string | null
          pathId: string | null
          title: string | null
          updatedAt: string
        }
        Insert: {
          coachingText?: string | null
          createdAt?: string
          estimatedMinutes?: number | null
          id?: string
          index?: number | null
          microCommitment?: string | null
          pathId?: string | null
          title?: string | null
          updatedAt?: string
        }
        Update: {
          coachingText?: string | null
          createdAt?: string
          estimatedMinutes?: number | null
          id?: string
          index?: number | null
          microCommitment?: string | null
          pathId?: string | null
          title?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathsession_pathId_fkey"
            columns: ["pathId"]
            isOneToOne: false
            referencedRelation: "path"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aiConfidenceLevel: string | null
          alignmentScore: number | null
          behavioralFingerprint: string | null
          checkInFrequency: string | null
          classification: string | null
          createdAt: string
          customerRole: string | null
          dailyCheckInStreak: number | null
          email: string | null
          firstName: string | null
          id: string
          isAdmin: boolean | null
          notificationFrequency: string | null
          onboardingCompleted: boolean
          onboardingCompletedAt: string | null
          onboardingData: Json | null
          orientationScore: number | null
          performanceScore: number | null
          preferences: string | null
          pressureProfile: string | null
          primaryPillar: string | null
          reassessmentCompletedAt: string | null
          reassessmentData: Json | null
          reassessmentReflections: Json | null
          reassessmentResults: Json | null
          results: Json | null
          roleType: string | null
          stabilityScore: number | null
          streakDays: number | null
          subscribed: boolean
          tier: string | null
          updatedAt: string
          workplaceId: string | null
        }
        Insert: {
          aiConfidenceLevel?: string | null
          alignmentScore?: number | null
          behavioralFingerprint?: string | null
          checkInFrequency?: string | null
          classification?: string | null
          createdAt?: string
          customerRole?: string | null
          dailyCheckInStreak?: number | null
          email?: string | null
          firstName?: string | null
          id: string
          isAdmin?: boolean | null
          notificationFrequency?: string | null
          onboardingCompleted?: boolean
          onboardingCompletedAt?: string | null
          onboardingData?: Json | null
          orientationScore?: number | null
          performanceScore?: number | null
          preferences?: string | null
          pressureProfile?: string | null
          primaryPillar?: string | null
          reassessmentCompletedAt?: string | null
          reassessmentData?: Json | null
          reassessmentReflections?: Json | null
          reassessmentResults?: Json | null
          results?: Json | null
          roleType?: string | null
          stabilityScore?: number | null
          streakDays?: number | null
          subscribed?: boolean
          tier?: string | null
          updatedAt?: string
          workplaceId?: string | null
        }
        Update: {
          aiConfidenceLevel?: string | null
          alignmentScore?: number | null
          behavioralFingerprint?: string | null
          checkInFrequency?: string | null
          classification?: string | null
          createdAt?: string
          customerRole?: string | null
          dailyCheckInStreak?: number | null
          email?: string | null
          firstName?: string | null
          id?: string
          isAdmin?: boolean | null
          notificationFrequency?: string | null
          onboardingCompleted?: boolean
          onboardingCompletedAt?: string | null
          onboardingData?: Json | null
          orientationScore?: number | null
          performanceScore?: number | null
          preferences?: string | null
          pressureProfile?: string | null
          primaryPillar?: string | null
          reassessmentCompletedAt?: string | null
          reassessmentData?: Json | null
          reassessmentReflections?: Json | null
          reassessmentResults?: Json | null
          results?: Json | null
          roleType?: string | null
          stabilityScore?: number | null
          streakDays?: number | null
          subscribed?: boolean
          tier?: string | null
          updatedAt?: string
          workplaceId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workplace_fkey"
            columns: ["workplaceId"]
            isOneToOne: false
            referencedRelation: "workplace"
            referencedColumns: ["id"]
          },
        ]
      }
      resource: {
        Row: {
          content: string | null
          createdAt: string
          externalLink: string | null
          id: string
          isCrisisResource: boolean | null
          isFree: boolean | null
          primaryModeTag: string | null
          sensitivityFlag: string | null
          subModeTag: string | null
          title: string | null
          updatedAt: string
        }
        Insert: {
          content?: string | null
          createdAt?: string
          externalLink?: string | null
          id?: string
          isCrisisResource?: boolean | null
          isFree?: boolean | null
          primaryModeTag?: string | null
          sensitivityFlag?: string | null
          subModeTag?: string | null
          title?: string | null
          updatedAt?: string
        }
        Update: {
          content?: string | null
          createdAt?: string
          externalLink?: string | null
          id?: string
          isCrisisResource?: boolean | null
          isFree?: boolean | null
          primaryModeTag?: string | null
          sensitivityFlag?: string | null
          subModeTag?: string | null
          title?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      subscriptionPlan: {
        Row: {
          createdAt: string
          description: string | null
          features: string | null
          id: string
          name: string | null
          price: number | null
          tierSlug: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          features?: string | null
          id: string
          name?: string | null
          price?: number | null
          tierSlug?: string | null
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          features?: string | null
          id?: string
          name?: string | null
          price?: number | null
          tierSlug?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      journalEntry: {
        Row: {
          aiReflection: string | null
          content: string | null
          createdAt: string
          id: string
          moodTag: string | null
          title: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          aiReflection?: string | null
          content?: string | null
          createdAt?: string
          id?: string
          moodTag?: string | null
          title?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          aiReflection?: string | null
          content?: string | null
          createdAt?: string
          id?: string
          moodTag?: string | null
          title?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: []
      }
      milestone: {
        Row: {
          achievedAt: string | null
          createdAt: string
          description: string | null
          id: string
          title: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          achievedAt?: string | null
          createdAt?: string
          description?: string | null
          id?: string
          title?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          achievedAt?: string | null
          createdAt?: string
          description?: string | null
          id?: string
          title?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: []
      }
      relapseEvent: {
        Row: {
          createdAt: string
          eventDate: string | null
          id: string
          notes: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          createdAt?: string
          eventDate?: string | null
          id?: string
          notes?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          createdAt?: string
          eventDate?: string | null
          id?: string
          notes?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: []
      }
      workplace: {
        Row: {
          contactEmail: string | null
          createdAt: string
          id: string
          name: string | null
          updatedAt: string
        }
        Insert: {
          contactEmail?: string | null
          createdAt?: string
          id?: string
          name?: string | null
          updatedAt?: string
        }
        Update: {
          contactEmail?: string | null
          createdAt?: string
          id?: string
          name?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      userOwnsRow: { Args: { owner: string }; Returns: boolean }
      is_settings_admin: { Args: never; Returns: boolean }
      list_billing_invoices: { Args: never; Returns: Json }
      open_billing_portal: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
