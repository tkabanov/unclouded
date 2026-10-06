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
  public: {
    Tables: {
      adminOrgAuditLog: {
        Row: {
          action: string
          actorUserId: string | null
          createdAt: string
          field: string | null
          id: string
          newValue: string | null
          oldValue: string | null
          workplaceId: string | null
        }
        Insert: {
          action: string
          actorUserId?: string | null
          createdAt?: string
          field?: string | null
          id?: string
          newValue?: string | null
          oldValue?: string | null
          workplaceId?: string | null
        }
        Update: {
          action?: string
          actorUserId?: string | null
          createdAt?: string
          field?: string | null
          id?: string
          newValue?: string | null
          oldValue?: string | null
          workplaceId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adminOrgAuditLog_workplaceId_fkey"
            columns: ["workplaceId"]
            isOneToOne: false
            referencedRelation: "workplace"
            referencedColumns: ["id"]
          },
        ]
      }
      assessmentResult: {
        Row: {
          alignmentScore: number | null
          assessmentDate: string
          classification: string | null
          coachingSummaryAttemptCount: number
          coachingSummaryEscalatedAt: string | null
          coachingSummaryJson: Json | null
          coachingSummaryReady: boolean
          coachingSummaryRetryAt: string | null
          createdAt: string
          id: string
          isInitial: boolean
          orientationScore: number | null
          pathAdaptiveAnswer: string | null
          pathAdaptiveQ: string | null
          pdfGenerated: boolean
          pdfNarrative: Json | null
          pdfUrl: string | null
          performanceScore: number | null
          rawResults: Json | null
          rawScores: Json | null
          reflectionQ1: string | null
          reflectionQ2: string | null
          reflectionQ3: string | null
          reflectionQ4: string | null
          stabilityScore: number | null
          trajectoryStatementText: string | null
          trajectoryType: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          alignmentScore?: number | null
          assessmentDate?: string
          classification?: string | null
          coachingSummaryAttemptCount?: number
          coachingSummaryEscalatedAt?: string | null
          coachingSummaryJson?: Json | null
          coachingSummaryReady?: boolean
          coachingSummaryRetryAt?: string | null
          createdAt?: string
          id?: string
          isInitial?: boolean
          orientationScore?: number | null
          pathAdaptiveAnswer?: string | null
          pathAdaptiveQ?: string | null
          pdfGenerated?: boolean
          pdfNarrative?: Json | null
          pdfUrl?: string | null
          performanceScore?: number | null
          rawResults?: Json | null
          rawScores?: Json | null
          reflectionQ1?: string | null
          reflectionQ2?: string | null
          reflectionQ3?: string | null
          reflectionQ4?: string | null
          stabilityScore?: number | null
          trajectoryStatementText?: string | null
          trajectoryType?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          alignmentScore?: number | null
          assessmentDate?: string
          classification?: string | null
          coachingSummaryAttemptCount?: number
          coachingSummaryEscalatedAt?: string | null
          coachingSummaryJson?: Json | null
          coachingSummaryReady?: boolean
          coachingSummaryRetryAt?: string | null
          createdAt?: string
          id?: string
          isInitial?: boolean
          orientationScore?: number | null
          pathAdaptiveAnswer?: string | null
          pathAdaptiveQ?: string | null
          pdfGenerated?: boolean
          pdfNarrative?: Json | null
          pdfUrl?: string | null
          performanceScore?: number | null
          rawResults?: Json | null
          rawScores?: Json | null
          reflectionQ1?: string | null
          reflectionQ2?: string | null
          reflectionQ3?: string | null
          reflectionQ4?: string | null
          stabilityScore?: number | null
          trajectoryStatementText?: string | null
          trajectoryType?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      chatConversation: {
        Row: {
          createdAt: string
          finalizedAt: string | null
          hadCrisisEscalation: boolean
          id: string
          sessionType: string
          title: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          createdAt?: string
          finalizedAt?: string | null
          hadCrisisEscalation?: boolean
          id?: string
          sessionType?: string
          title?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          createdAt?: string
          finalizedAt?: string | null
          hadCrisisEscalation?: boolean
          id?: string
          sessionType?: string
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
            foreignKeyName: "chatmessage_conversation_custom_chatconversation_fkey"
            columns: ["conversationId"]
            isOneToOne: false
            referencedRelation: "chatConversation"
            referencedColumns: ["id"]
          },
        ]
      }
      coachBooking: {
        Row: {
          assignedCoachEmail: string | null
          cancelledAt: string | null
          coachSessionNotes: string | null
          completedAt: string | null
          confirmedAt: string | null
          createdAt: string
          creditsRequired: number
          durationMinutes: number
          endWarning5mDetail: string | null
          endWarning5mSentAt: string | null
          externalBookingRef: string | null
          googleEventId: string | null
          id: string
          kotaRead: string | null
          kotaReadEmailDetail: string | null
          kotaReadEmailedAt: string | null
          kotaReadJson: Json | null
          meetBackfillAttemptedAt: string | null
          meetBackfillDetail: string | null
          meetLink: string | null
          postSessionKotaSyncDetail: string | null
          postSessionKotaSyncedAt: string | null
          postSessionSubmittedAt: string | null
          postSessionToken: string
          reminder1hDetail: string | null
          reminder1hSentAt: string | null
          reminder24hDetail: string | null
          reminder24hSentAt: string | null
          scheduledAt: string | null
          specialistId: string | null
          status: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          assignedCoachEmail?: string | null
          cancelledAt?: string | null
          coachSessionNotes?: string | null
          completedAt?: string | null
          confirmedAt?: string | null
          createdAt?: string
          creditsRequired?: number
          durationMinutes?: number
          endWarning5mDetail?: string | null
          endWarning5mSentAt?: string | null
          externalBookingRef?: string | null
          googleEventId?: string | null
          id?: string
          kotaRead?: string | null
          kotaReadEmailDetail?: string | null
          kotaReadEmailedAt?: string | null
          kotaReadJson?: Json | null
          meetBackfillAttemptedAt?: string | null
          meetBackfillDetail?: string | null
          meetLink?: string | null
          postSessionKotaSyncDetail?: string | null
          postSessionKotaSyncedAt?: string | null
          postSessionSubmittedAt?: string | null
          postSessionToken?: string
          reminder1hDetail?: string | null
          reminder1hSentAt?: string | null
          reminder24hDetail?: string | null
          reminder24hSentAt?: string | null
          scheduledAt?: string | null
          specialistId?: string | null
          status?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          assignedCoachEmail?: string | null
          cancelledAt?: string | null
          coachSessionNotes?: string | null
          completedAt?: string | null
          confirmedAt?: string | null
          createdAt?: string
          creditsRequired?: number
          durationMinutes?: number
          endWarning5mDetail?: string | null
          endWarning5mSentAt?: string | null
          externalBookingRef?: string | null
          googleEventId?: string | null
          id?: string
          kotaRead?: string | null
          kotaReadEmailDetail?: string | null
          kotaReadEmailedAt?: string | null
          kotaReadJson?: Json | null
          meetBackfillAttemptedAt?: string | null
          meetBackfillDetail?: string | null
          meetLink?: string | null
          postSessionKotaSyncDetail?: string | null
          postSessionKotaSyncedAt?: string | null
          postSessionSubmittedAt?: string | null
          postSessionToken?: string
          reminder1hDetail?: string | null
          reminder1hSentAt?: string | null
          reminder24hDetail?: string | null
          reminder24hSentAt?: string | null
          scheduledAt?: string | null
          specialistId?: string | null
          status?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "coachBooking_specialistId_fkey"
            columns: ["specialistId"]
            isOneToOne: false
            referencedRelation: "specialist"
            referencedColumns: ["id"]
          },
        ]
      }
      coachingInsightArticle: {
        Row: {
          body: string
          classificationKey: string | null
          createdAt: string
          id: string
          nervousSystem: string | null
          primaryPillar: string | null
          published: boolean
          summary: string
          title: string
          updatedAt: string
        }
        Insert: {
          body?: string
          classificationKey?: string | null
          createdAt?: string
          id?: string
          nervousSystem?: string | null
          primaryPillar?: string | null
          published?: boolean
          summary: string
          title: string
          updatedAt?: string
        }
        Update: {
          body?: string
          classificationKey?: string | null
          createdAt?: string
          id?: string
          nervousSystem?: string | null
          primaryPillar?: string | null
          published?: boolean
          summary?: string
          title?: string
          updatedAt?: string
        }
        Relationships: []
      }
      coachingSessionArchive: {
        Row: {
          classificationAtSession: string | null
          coachingModeUsed: string | null
          conversationId: string | null
          createdAt: string
          exchangeCount: number | null
          finalizedAt: string
          hadCrisisEscalation: boolean
          id: string
          loadSignalsSnapshot: Json | null
          sessionType: string
          summaryJson: Json
          userId: string
        }
        Insert: {
          classificationAtSession?: string | null
          coachingModeUsed?: string | null
          conversationId?: string | null
          createdAt?: string
          exchangeCount?: number | null
          finalizedAt?: string
          hadCrisisEscalation?: boolean
          id?: string
          loadSignalsSnapshot?: Json | null
          sessionType?: string
          summaryJson?: Json
          userId: string
        }
        Update: {
          classificationAtSession?: string | null
          coachingModeUsed?: string | null
          conversationId?: string | null
          createdAt?: string
          exchangeCount?: number | null
          finalizedAt?: string
          hadCrisisEscalation?: boolean
          id?: string
          loadSignalsSnapshot?: Json | null
          sessionType?: string
          summaryJson?: Json
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "coachingSessionArchive_conversationId_fkey"
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
          feelingWord: string | null
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
          feelingWord?: string | null
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
          feelingWord?: string | null
          id?: string
          mood?: number | null
          reflection?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: []
      }
      dailyInsight: {
        Row: {
          createdAt: string
          id: string
          insight1Body: string
          insight1Title: string
          insight2Body: string
          insight2Title: string
          insight3Body: string
          insight3Title: string
          insightDate: string
          notifiedAt: string | null
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          insight1Body: string
          insight1Title: string
          insight2Body: string
          insight2Title: string
          insight3Body: string
          insight3Title: string
          insightDate: string
          notifiedAt?: string | null
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          insight1Body?: string
          insight1Title?: string
          insight2Body?: string
          insight2Title?: string
          insight3Body?: string
          insight3Title?: string
          insightDate?: string
          notifiedAt?: string | null
          userId?: string
        }
        Relationships: []
      }
      dailyInsightRetry: {
        Row: {
          attemptCount: number
          createdAt: string
          id: string
          insightDate: string
          retryAt: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          attemptCount?: number
          createdAt?: string
          id?: string
          insightDate: string
          retryAt?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          attemptCount?: number
          createdAt?: string
          id?: string
          insightDate?: string
          retryAt?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      edgeRateLimitBucket: {
        Row: {
          attemptCount: number
          bucketKey: string
          windowStart: string
        }
        Insert: {
          attemptCount?: number
          bucketKey: string
          windowStart: string
        }
        Update: {
          attemptCount?: number
          bucketKey?: string
          windowStart?: string
        }
        Relationships: []
      }
      foundingMemberSlot: {
        Row: {
          claimedAt: string
          releasedAt: string | null
          slotNumber: number
          userId: string
        }
        Insert: {
          claimedAt?: string
          releasedAt?: string | null
          slotNumber: number
          userId: string
        }
        Update: {
          claimedAt?: string
          releasedAt?: string | null
          slotNumber?: number
          userId?: string
        }
        Relationships: []
      }
      groupCoachingSession: {
        Row: {
          cancelledAt: string | null
          capacity: number
          createdAt: string
          description: string
          durationMinutes: number
          googleEventId: string | null
          id: string
          meetBackfillAttemptedAt: string | null
          meetBackfillDetail: string | null
          meetLink: string | null
          seriesId: string | null
          startsAt: string
          status: string
          title: string
          updatedAt: string
        }
        Insert: {
          cancelledAt?: string | null
          capacity: number
          createdAt?: string
          description?: string
          durationMinutes?: number
          googleEventId?: string | null
          id?: string
          meetBackfillAttemptedAt?: string | null
          meetBackfillDetail?: string | null
          meetLink?: string | null
          seriesId?: string | null
          startsAt: string
          status?: string
          title: string
          updatedAt?: string
        }
        Update: {
          cancelledAt?: string | null
          capacity?: number
          createdAt?: string
          description?: string
          durationMinutes?: number
          googleEventId?: string | null
          id?: string
          meetBackfillAttemptedAt?: string | null
          meetBackfillDetail?: string | null
          meetLink?: string | null
          seriesId?: string | null
          startsAt?: string
          status?: string
          title?: string
          updatedAt?: string
        }
        Relationships: []
      }
      groupSessionBooking: {
        Row: {
          assignedCoachEmail: string | null
          cancelledAt: string | null
          id: string
          kotaRead: string | null
          kotaReadEmailDetail: string | null
          kotaReadEmailedAt: string | null
          kotaReadJson: Json | null
          periodMonth: string
          requestedAt: string
          scheduledAt: string | null
          status: string
          userId: string
        }
        Insert: {
          assignedCoachEmail?: string | null
          cancelledAt?: string | null
          id?: string
          kotaRead?: string | null
          kotaReadEmailDetail?: string | null
          kotaReadEmailedAt?: string | null
          kotaReadJson?: Json | null
          periodMonth: string
          requestedAt?: string
          scheduledAt?: string | null
          status?: string
          userId: string
        }
        Update: {
          assignedCoachEmail?: string | null
          cancelledAt?: string | null
          id?: string
          kotaRead?: string | null
          kotaReadEmailDetail?: string | null
          kotaReadEmailedAt?: string | null
          kotaReadJson?: Json | null
          periodMonth?: string
          requestedAt?: string
          scheduledAt?: string | null
          status?: string
          userId?: string
        }
        Relationships: []
      }
      groupSessionEnrollment: {
        Row: {
          cancelledAt: string | null
          claimExpiresAt: string | null
          createdAt: string
          id: string
          offerNotifiedAt: string | null
          periodMonth: string
          registeredAt: string | null
          sessionId: string
          status: string
          updatedAt: string
          userId: string
          waitlistedAt: string | null
        }
        Insert: {
          cancelledAt?: string | null
          claimExpiresAt?: string | null
          createdAt?: string
          id?: string
          offerNotifiedAt?: string | null
          periodMonth: string
          registeredAt?: string | null
          sessionId: string
          status: string
          updatedAt?: string
          userId: string
          waitlistedAt?: string | null
        }
        Update: {
          cancelledAt?: string | null
          claimExpiresAt?: string | null
          createdAt?: string
          id?: string
          offerNotifiedAt?: string | null
          periodMonth?: string
          registeredAt?: string | null
          sessionId?: string
          status?: string
          updatedAt?: string
          userId?: string
          waitlistedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groupSessionEnrollment_sessionId_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "groupCoachingSession"
            referencedColumns: ["id"]
          },
        ]
      }
      journalEntry: {
        Row: {
          aiReflection: string | null
          content: string | null
          createdAt: string
          id: string
          moodTag: string | null
          reflectionReady: boolean
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
          reflectionReady?: boolean
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
          reflectionReady?: boolean
          title?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: []
      }
      managerDirectReport: {
        Row: {
          createdAt: string
          id: string
          managerUserId: string
          reportUserId: string
          workplaceId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          managerUserId: string
          reportUserId: string
          workplaceId: string
        }
        Update: {
          createdAt?: string
          id?: string
          managerUserId?: string
          reportUserId?: string
          workplaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "managerDirectReport_workplaceId_fkey"
            columns: ["workplaceId"]
            isOneToOne: false
            referencedRelation: "workplace"
            referencedColumns: ["id"]
          },
        ]
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
      path: {
        Row: {
          aiCoachingMode: string | null
          classifications: string | null
          createdAt: string
          description: string | null
          id: string
          isActive: boolean
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
          isActive?: boolean
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
          isActive?: boolean
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
          assignedByUserId: string | null
          assignedByWorkplaceId: string | null
          completedMicroCommitmentSessionIds: Json | null
          completedSessionsCount: number | null
          createdAt: string
          currentSessionId: string | null
          focusedMicroCommitmentSessionId: string | null
          id: string
          isMicroCommitmentInFocus: boolean | null
          pathId: string | null
          source: string
          status: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          assignedByUserId?: string | null
          assignedByWorkplaceId?: string | null
          completedMicroCommitmentSessionIds?: Json | null
          completedSessionsCount?: number | null
          createdAt?: string
          currentSessionId?: string | null
          focusedMicroCommitmentSessionId?: string | null
          id?: string
          isMicroCommitmentInFocus?: boolean | null
          pathId?: string | null
          source?: string
          status?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          assignedByUserId?: string | null
          assignedByWorkplaceId?: string | null
          completedMicroCommitmentSessionIds?: Json | null
          completedSessionsCount?: number | null
          createdAt?: string
          currentSessionId?: string | null
          focusedMicroCommitmentSessionId?: string | null
          id?: string
          isMicroCommitmentInFocus?: boolean | null
          pathId?: string | null
          source?: string
          status?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathEnrollment_assignedByWorkplaceId_fkey"
            columns: ["assignedByWorkplaceId"]
            isOneToOne: false
            referencedRelation: "workplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathenrollment1_current_session_custom_pathsession_fkey"
            columns: ["currentSessionId"]
            isOneToOne: false
            referencedRelation: "pathSession"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathenrollment1_focused_m_commitment_custom_pathsession_fkey"
            columns: ["focusedMicroCommitmentSessionId"]
            isOneToOne: false
            referencedRelation: "pathSession"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathenrollment1_path_custom_path_fkey"
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
            foreignKeyName: "pathquestion_session_custom_pathsession_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "pathSession"
            referencedColumns: ["id"]
          },
        ]
      }
      pathResponse: {
        Row: {
          answerText: string | null
          createdAt: string
          id: string
          questionId: string | null
          questionText: string | null
          sessionId: string | null
          updatedAt: string
          userId: string | null
        }
        Insert: {
          answerText?: string | null
          createdAt?: string
          id?: string
          questionId?: string | null
          questionText?: string | null
          sessionId?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          answerText?: string | null
          createdAt?: string
          id?: string
          questionId?: string | null
          questionText?: string | null
          sessionId?: string | null
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathResponse_questionId_fkey"
            columns: ["questionId"]
            isOneToOne: false
            referencedRelation: "pathQuestion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathResponse_sessionId_fkey"
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
          reassessmentReflectionQuestion: string | null
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
          reassessmentReflectionQuestion?: string | null
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
          reassessmentReflectionQuestion?: string | null
          title?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathsession_path_custom_path_fkey"
            columns: ["pathId"]
            isOneToOne: false
            referencedRelation: "path"
            referencedColumns: ["id"]
          },
        ]
      }
      pathSessionCompletion: {
        Row: {
          closingAcknowledgment: string | null
          closingCta: string
          closingSitWith: string | null
          createdAt: string
          enrollmentId: string | null
          id: string
          pathId: string | null
          pathSessionId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          closingAcknowledgment?: string | null
          closingCta?: string
          closingSitWith?: string | null
          createdAt?: string
          enrollmentId?: string | null
          id?: string
          pathId?: string | null
          pathSessionId: string
          updatedAt?: string
          userId: string
        }
        Update: {
          closingAcknowledgment?: string | null
          closingCta?: string
          closingSitWith?: string | null
          createdAt?: string
          enrollmentId?: string | null
          id?: string
          pathId?: string | null
          pathSessionId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathSessionCompletion_pathId_fkey"
            columns: ["pathId"]
            isOneToOne: false
            referencedRelation: "path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathSessionCompletion_pathSessionId_fkey"
            columns: ["pathSessionId"]
            isOneToOne: false
            referencedRelation: "pathSession"
            referencedColumns: ["id"]
          },
        ]
      }
      platformAiSettings: {
        Row: {
          createdAt: string
          globalSystemPrompt: string
          id: number
          prohibitedTopics: string[]
          toneOfVoice: string
          updatedAt: string
          updatedBy: string | null
        }
        Insert: {
          createdAt?: string
          globalSystemPrompt?: string
          id?: number
          prohibitedTopics?: string[]
          toneOfVoice?: string
          updatedAt?: string
          updatedBy?: string | null
        }
        Update: {
          createdAt?: string
          globalSystemPrompt?: string
          id?: number
          prohibitedTopics?: string[]
          toneOfVoice?: string
          updatedAt?: string
          updatedBy?: string | null
        }
        Relationships: []
      }
      premiumCreditLedger: {
        Row: {
          coachBookingId: string | null
          createdAt: string
          delta: number
          id: string
          note: string | null
          reason: string
          stripeInvoiceId: string | null
          userId: string
        }
        Insert: {
          coachBookingId?: string | null
          createdAt?: string
          delta: number
          id?: string
          note?: string | null
          reason: string
          stripeInvoiceId?: string | null
          userId: string
        }
        Update: {
          coachBookingId?: string | null
          createdAt?: string
          delta?: number
          id?: string
          note?: string | null
          reason?: string
          stripeInvoiceId?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "premiumCreditLedger_coachBookingId_fkey"
            columns: ["coachBookingId"]
            isOneToOne: false
            referencedRelation: "coachBooking"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accountType: string
          ageRange: string | null
          aiConfidenceLevel: string | null
          alignmentScore: number | null
          attachmentSignal: string | null
          behavioralFingerprint: string | null
          belongingLevel: string | null
          bodyRelationship: string | null
          canReassessOnDemand: boolean
          careerStage: string | null
          checkInFrequency: string | null
          checkinReminderSentAt: string | null
          chronicHealthCondition: string | null
          chronicPainFlag: boolean | null
          classification: string | null
          coachingSummaryFailed: boolean
          companySize: string | null
          conflictPattern: string | null
          createdAt: string
          customerRole: string | null
          dailyCheckInStreak: number | null
          deactivatedAt: string | null
          email: string | null
          employmentStatus: string | null
          enrollmentDate: string | null
          enterpriseTier: string | null
          financialAgencyLevel: string | null
          financialAnxietyLevel: string | null
          financialStabilitySignal: string | null
          firstModuleMilestoneEmailedAt: string | null
          firstName: string | null
          genderIdentity: string | null
          griefLoadLevel: string | null
          groupSessionsUsedThisMonth: number
          hasPriorCrisisSession: boolean
          hormonalContextFlag: boolean | null
          hormonalContextType: string | null
          id: string
          identityNarrativeType: string | null
          identityPressureOrigin: string | null
          identityRoleFusionScore: number | null
          identitySelfWorthSource: string | null
          inactivityFollowupBaselineActivityAt: string | null
          inactivityFollowupSentAt: string | null
          industry: string | null
          intimacySafetyLevel: string | null
          isActive: boolean
          isAdmin: boolean | null
          lastAssessmentDate: string | null
          lastName: string | null
          lastNotificationSentAt: string | null
          managerAggregateOptIn: boolean
          managesATeam: boolean | null
          moduleBodyComplete: boolean
          moduleFinancialComplete: boolean
          moduleHistoryComplete: boolean
          moduleIdentityComplete: boolean
          moduleMeaningComplete: boolean
          moduleRelationalComplete: boolean
          moduleSchedules: Json
          modulesCompletedCount: number
          nextReassessmentDate: string | null
          notificationFrequency: string | null
          onboardingCompleted: boolean
          onboardingCompletedAt: string | null
          onboardingData: Json | null
          onboardingDropoffEmailedAt: string | null
          orientationScore: number | null
          parentingStatus: string | null
          performanceScore: number | null
          physicalActivityLevel: string | null
          preferences: string | null
          pressureProfile: string | null
          pressureReach: string | null
          primaryPillar: string | null
          priorSupportType: string | null
          pulseBaseline: number | null
          purposeClarity: string | null
          reassessmentCompletedAt: string | null
          reassessmentData: Json | null
          reassessmentDueEmailedAt: string | null
          reassessmentReflections: Json | null
          reassessmentResults: Json | null
          referralCode: string | null
          referralCorrectedAt: string | null
          referralCorrectedBy: string | null
          referralFirstPaidAt: string | null
          referralPartnerCode: string | null
          referralPartnerId: string | null
          referredAt: string | null
          referredByReferralCode: string | null
          referredByUserId: string | null
          relationshipStatus: string | null
          results: Json | null
          roleType: string | null
          roleTypes: string[]
          significantEvents12mo: Json | null
          significantPulseDrop: boolean
          signupPlan: string | null
          sleepQualitySignal: string | null
          spiritualFrameworkPresent: boolean | null
          spiritualFrameworkType: string | null
          stabilityScore: number | null
          stateRegion: string | null
          streakDays: number | null
          subscribed: boolean
          substancePatternSignal: string | null
          supportSeekingCapacity: string | null
          tier: string | null
          timeZone: string | null
          traumaActivationLevel: string | null
          updatedAt: string
          utmCampaign: string | null
          utmMedium: string | null
          utmSource: string | null
          vulnerableOutreachEmailedAt: string | null
          workEnvironment: string | null
          workplaceId: string | null
        }
        Insert: {
          accountType?: string
          ageRange?: string | null
          aiConfidenceLevel?: string | null
          alignmentScore?: number | null
          attachmentSignal?: string | null
          behavioralFingerprint?: string | null
          belongingLevel?: string | null
          bodyRelationship?: string | null
          canReassessOnDemand?: boolean
          careerStage?: string | null
          checkInFrequency?: string | null
          checkinReminderSentAt?: string | null
          chronicHealthCondition?: string | null
          chronicPainFlag?: boolean | null
          classification?: string | null
          coachingSummaryFailed?: boolean
          companySize?: string | null
          conflictPattern?: string | null
          createdAt?: string
          customerRole?: string | null
          dailyCheckInStreak?: number | null
          deactivatedAt?: string | null
          email?: string | null
          employmentStatus?: string | null
          enrollmentDate?: string | null
          enterpriseTier?: string | null
          financialAgencyLevel?: string | null
          financialAnxietyLevel?: string | null
          financialStabilitySignal?: string | null
          firstModuleMilestoneEmailedAt?: string | null
          firstName?: string | null
          genderIdentity?: string | null
          griefLoadLevel?: string | null
          groupSessionsUsedThisMonth?: number
          hasPriorCrisisSession?: boolean
          hormonalContextFlag?: boolean | null
          hormonalContextType?: string | null
          id: string
          identityNarrativeType?: string | null
          identityPressureOrigin?: string | null
          identityRoleFusionScore?: number | null
          identitySelfWorthSource?: string | null
          inactivityFollowupBaselineActivityAt?: string | null
          inactivityFollowupSentAt?: string | null
          industry?: string | null
          intimacySafetyLevel?: string | null
          isActive?: boolean
          isAdmin?: boolean | null
          lastAssessmentDate?: string | null
          lastName?: string | null
          lastNotificationSentAt?: string | null
          managerAggregateOptIn?: boolean
          managesATeam?: boolean | null
          moduleBodyComplete?: boolean
          moduleFinancialComplete?: boolean
          moduleHistoryComplete?: boolean
          moduleIdentityComplete?: boolean
          moduleMeaningComplete?: boolean
          moduleRelationalComplete?: boolean
          moduleSchedules?: Json
          modulesCompletedCount?: number
          nextReassessmentDate?: string | null
          notificationFrequency?: string | null
          onboardingCompleted?: boolean
          onboardingCompletedAt?: string | null
          onboardingData?: Json | null
          onboardingDropoffEmailedAt?: string | null
          orientationScore?: number | null
          parentingStatus?: string | null
          performanceScore?: number | null
          physicalActivityLevel?: string | null
          preferences?: string | null
          pressureProfile?: string | null
          pressureReach?: string | null
          primaryPillar?: string | null
          priorSupportType?: string | null
          pulseBaseline?: number | null
          purposeClarity?: string | null
          reassessmentCompletedAt?: string | null
          reassessmentData?: Json | null
          reassessmentDueEmailedAt?: string | null
          reassessmentReflections?: Json | null
          reassessmentResults?: Json | null
          referralCode?: string | null
          referralCorrectedAt?: string | null
          referralCorrectedBy?: string | null
          referralFirstPaidAt?: string | null
          referralPartnerCode?: string | null
          referralPartnerId?: string | null
          referredAt?: string | null
          referredByReferralCode?: string | null
          referredByUserId?: string | null
          relationshipStatus?: string | null
          results?: Json | null
          roleType?: string | null
          roleTypes?: string[]
          significantEvents12mo?: Json | null
          significantPulseDrop?: boolean
          signupPlan?: string | null
          sleepQualitySignal?: string | null
          spiritualFrameworkPresent?: boolean | null
          spiritualFrameworkType?: string | null
          stabilityScore?: number | null
          stateRegion?: string | null
          streakDays?: number | null
          subscribed?: boolean
          substancePatternSignal?: string | null
          supportSeekingCapacity?: string | null
          tier?: string | null
          timeZone?: string | null
          traumaActivationLevel?: string | null
          updatedAt?: string
          utmCampaign?: string | null
          utmMedium?: string | null
          utmSource?: string | null
          vulnerableOutreachEmailedAt?: string | null
          workEnvironment?: string | null
          workplaceId?: string | null
        }
        Update: {
          accountType?: string
          ageRange?: string | null
          aiConfidenceLevel?: string | null
          alignmentScore?: number | null
          attachmentSignal?: string | null
          behavioralFingerprint?: string | null
          belongingLevel?: string | null
          bodyRelationship?: string | null
          canReassessOnDemand?: boolean
          careerStage?: string | null
          checkInFrequency?: string | null
          checkinReminderSentAt?: string | null
          chronicHealthCondition?: string | null
          chronicPainFlag?: boolean | null
          classification?: string | null
          coachingSummaryFailed?: boolean
          companySize?: string | null
          conflictPattern?: string | null
          createdAt?: string
          customerRole?: string | null
          dailyCheckInStreak?: number | null
          deactivatedAt?: string | null
          email?: string | null
          employmentStatus?: string | null
          enrollmentDate?: string | null
          enterpriseTier?: string | null
          financialAgencyLevel?: string | null
          financialAnxietyLevel?: string | null
          financialStabilitySignal?: string | null
          firstModuleMilestoneEmailedAt?: string | null
          firstName?: string | null
          genderIdentity?: string | null
          griefLoadLevel?: string | null
          groupSessionsUsedThisMonth?: number
          hasPriorCrisisSession?: boolean
          hormonalContextFlag?: boolean | null
          hormonalContextType?: string | null
          id?: string
          identityNarrativeType?: string | null
          identityPressureOrigin?: string | null
          identityRoleFusionScore?: number | null
          identitySelfWorthSource?: string | null
          inactivityFollowupBaselineActivityAt?: string | null
          inactivityFollowupSentAt?: string | null
          industry?: string | null
          intimacySafetyLevel?: string | null
          isActive?: boolean
          isAdmin?: boolean | null
          lastAssessmentDate?: string | null
          lastName?: string | null
          lastNotificationSentAt?: string | null
          managerAggregateOptIn?: boolean
          managesATeam?: boolean | null
          moduleBodyComplete?: boolean
          moduleFinancialComplete?: boolean
          moduleHistoryComplete?: boolean
          moduleIdentityComplete?: boolean
          moduleMeaningComplete?: boolean
          moduleRelationalComplete?: boolean
          moduleSchedules?: Json
          modulesCompletedCount?: number
          nextReassessmentDate?: string | null
          notificationFrequency?: string | null
          onboardingCompleted?: boolean
          onboardingCompletedAt?: string | null
          onboardingData?: Json | null
          onboardingDropoffEmailedAt?: string | null
          orientationScore?: number | null
          parentingStatus?: string | null
          performanceScore?: number | null
          physicalActivityLevel?: string | null
          preferences?: string | null
          pressureProfile?: string | null
          pressureReach?: string | null
          primaryPillar?: string | null
          priorSupportType?: string | null
          pulseBaseline?: number | null
          purposeClarity?: string | null
          reassessmentCompletedAt?: string | null
          reassessmentData?: Json | null
          reassessmentDueEmailedAt?: string | null
          reassessmentReflections?: Json | null
          reassessmentResults?: Json | null
          referralCode?: string | null
          referralCorrectedAt?: string | null
          referralCorrectedBy?: string | null
          referralFirstPaidAt?: string | null
          referralPartnerCode?: string | null
          referralPartnerId?: string | null
          referredAt?: string | null
          referredByReferralCode?: string | null
          referredByUserId?: string | null
          relationshipStatus?: string | null
          results?: Json | null
          roleType?: string | null
          roleTypes?: string[]
          significantEvents12mo?: Json | null
          significantPulseDrop?: boolean
          signupPlan?: string | null
          sleepQualitySignal?: string | null
          spiritualFrameworkPresent?: boolean | null
          spiritualFrameworkType?: string | null
          stabilityScore?: number | null
          stateRegion?: string | null
          streakDays?: number | null
          subscribed?: boolean
          substancePatternSignal?: string | null
          supportSeekingCapacity?: string | null
          tier?: string | null
          timeZone?: string | null
          traumaActivationLevel?: string | null
          updatedAt?: string
          utmCampaign?: string | null
          utmMedium?: string | null
          utmSource?: string | null
          vulnerableOutreachEmailedAt?: string | null
          workEnvironment?: string | null
          workplaceId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referralCorrectedBy_fkey"
            columns: ["referralCorrectedBy"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referralPartnerId_fkey"
            columns: ["referralPartnerId"]
            isOneToOne: false
            referencedRelation: "referralPartner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_user_id_fkey"
            columns: ["referredByUserId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_workplace_fkey"
            columns: ["workplaceId"]
            isOneToOne: false
            referencedRelation: "workplace"
            referencedColumns: ["id"]
          },
        ]
      }
      promptLibraryApproval: {
        Row: {
          approvedAt: string
          approverUserId: string
          id: string
          notes: string | null
          overrideReason: string | null
          testRunId: string
          versionId: string
        }
        Insert: {
          approvedAt?: string
          approverUserId: string
          id?: string
          notes?: string | null
          overrideReason?: string | null
          testRunId: string
          versionId: string
        }
        Update: {
          approvedAt?: string
          approverUserId?: string
          id?: string
          notes?: string | null
          overrideReason?: string | null
          testRunId?: string
          versionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "promptLibraryApproval_testRunId_fkey"
            columns: ["testRunId"]
            isOneToOne: true
            referencedRelation: "promptLibraryTestRun"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promptLibraryApproval_versionId_fkey"
            columns: ["versionId"]
            isOneToOne: false
            referencedRelation: "promptLibraryVersion"
            referencedColumns: ["id"]
          },
        ]
      }
      promptLibraryLayer: {
        Row: {
          content: string
          createdAt: string
          id: string
          layerKey: string
          sortOrder: number
          updatedAt: string
          versionId: string
        }
        Insert: {
          content: string
          createdAt?: string
          id?: string
          layerKey: string
          sortOrder?: number
          updatedAt?: string
          versionId: string
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          layerKey?: string
          sortOrder?: number
          updatedAt?: string
          versionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "promptLibraryLayer_versionId_fkey"
            columns: ["versionId"]
            isOneToOne: false
            referencedRelation: "promptLibraryVersion"
            referencedColumns: ["id"]
          },
        ]
      }
      promptLibraryTestRun: {
        Row: {
          adminUserId: string
          createdAt: string
          flaggedCount: number
          id: string
          resultsJson: Json
          runAt: string
          versionId: string
        }
        Insert: {
          adminUserId: string
          createdAt?: string
          flaggedCount?: number
          id?: string
          resultsJson?: Json
          runAt?: string
          versionId: string
        }
        Update: {
          adminUserId?: string
          createdAt?: string
          flaggedCount?: number
          id?: string
          resultsJson?: Json
          runAt?: string
          versionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "promptLibraryTestRun_versionId_fkey"
            columns: ["versionId"]
            isOneToOne: false
            referencedRelation: "promptLibraryVersion"
            referencedColumns: ["id"]
          },
        ]
      }
      promptLibraryVersion: {
        Row: {
          approvedAt: string | null
          createdAt: string
          createdBy: string | null
          gitSha: string | null
          id: string
          label: string
          promotedAt: string | null
          status: string
          updatedAt: string
        }
        Insert: {
          approvedAt?: string | null
          createdAt?: string
          createdBy?: string | null
          gitSha?: string | null
          id?: string
          label: string
          promotedAt?: string | null
          status: string
          updatedAt?: string
        }
        Update: {
          approvedAt?: string | null
          createdAt?: string
          createdBy?: string | null
          gitSha?: string | null
          id?: string
          label?: string
          promotedAt?: string | null
          status?: string
          updatedAt?: string
        }
        Relationships: []
      }
      pushDeviceSubscription: {
        Row: {
          appVersion: string | null
          auth: string | null
          createdAt: string
          deviceToken: string | null
          endpoint: string | null
          id: string
          lastSeenAt: string
          p256dh: string | null
          platform: string
          updatedAt: string
          userAgent: string | null
          userId: string
        }
        Insert: {
          appVersion?: string | null
          auth?: string | null
          createdAt?: string
          deviceToken?: string | null
          endpoint?: string | null
          id?: string
          lastSeenAt?: string
          p256dh?: string | null
          platform?: string
          updatedAt?: string
          userAgent?: string | null
          userId: string
        }
        Update: {
          appVersion?: string | null
          auth?: string | null
          createdAt?: string
          deviceToken?: string | null
          endpoint?: string | null
          id?: string
          lastSeenAt?: string
          p256dh?: string | null
          platform?: string
          updatedAt?: string
          userAgent?: string | null
          userId?: string
        }
        Relationships: []
      }
      referralPartner: {
        Row: {
          contactInfo: string | null
          createdAt: string
          email: string
          id: string
          name: string
          referralCode: string
          status: string
          type: string
          updatedAt: string
        }
        Insert: {
          contactInfo?: string | null
          createdAt?: string
          email: string
          id?: string
          name: string
          referralCode: string
          status?: string
          type: string
          updatedAt?: string
        }
        Update: {
          contactInfo?: string | null
          createdAt?: string
          email?: string
          id?: string
          name?: string
          referralCode?: string
          status?: string
          type?: string
          updatedAt?: string
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
      specialist: {
        Row: {
          bio: string
          createdAt: string
          email: string
          id: string
          imageUrl: string | null
          isActive: boolean
          name: string
          timezone: string | null
          updatedAt: string
        }
        Insert: {
          bio?: string
          createdAt?: string
          email: string
          id?: string
          imageUrl?: string | null
          isActive?: boolean
          name: string
          timezone?: string | null
          updatedAt?: string
        }
        Update: {
          bio?: string
          createdAt?: string
          email?: string
          id?: string
          imageUrl?: string | null
          isActive?: boolean
          name?: string
          timezone?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      specialistAvailability: {
        Row: {
          createdAt: string
          durationMinutes: number
          endsAt: string
          id: string
          specialistId: string
          startsAt: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          durationMinutes?: number
          endsAt: string
          id?: string
          specialistId: string
          startsAt: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          durationMinutes?: number
          endsAt?: string
          id?: string
          specialistId?: string
          startsAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialistAvailability_specialistId_fkey"
            columns: ["specialistId"]
            isOneToOne: false
            referencedRelation: "specialist"
            referencedColumns: ["id"]
          },
        ]
      }
      stripeWebhookEvent: {
        Row: {
          id: string
          receivedAt: string
          type: string
        }
        Insert: {
          id: string
          receivedAt?: string
          type: string
        }
        Update: {
          id?: string
          receivedAt?: string
          type?: string
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
      subscriptionPlanPrice: {
        Row: {
          amountCents: number | null
          billingInterval: string
          createdAt: string
          currency: string
          id: string
          isActive: boolean
          isFoundingRate: boolean
          stripePriceId: string | null
          tierSlug: string
          updatedAt: string
        }
        Insert: {
          amountCents?: number | null
          billingInterval: string
          createdAt?: string
          currency?: string
          id?: string
          isActive?: boolean
          isFoundingRate?: boolean
          stripePriceId?: string | null
          tierSlug: string
          updatedAt?: string
        }
        Update: {
          amountCents?: number | null
          billingInterval?: string
          createdAt?: string
          currency?: string
          id?: string
          isActive?: boolean
          isFoundingRate?: boolean
          stripePriceId?: string | null
          tierSlug?: string
          updatedAt?: string
        }
        Relationships: []
      }
      successPlanAddon: {
        Row: {
          createdAt: string
          id: string
          purchasedAt: string
          revokedAt: string | null
          status: string
          stripeCheckoutSessionId: string | null
          stripePaymentIntentId: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          purchasedAt?: string
          revokedAt?: string | null
          status?: string
          stripeCheckoutSessionId?: string | null
          stripePaymentIntentId?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          purchasedAt?: string
          revokedAt?: string | null
          status?: string
          stripeCheckoutSessionId?: string | null
          stripePaymentIntentId?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      successPlanAddonPrice: {
        Row: {
          amountCents: number
          createdAt: string
          currency: string
          id: string
          isActive: boolean
          lookupKey: string
          stripePriceId: string | null
          updatedAt: string
        }
        Insert: {
          amountCents?: number
          createdAt?: string
          currency?: string
          id?: string
          isActive?: boolean
          lookupKey?: string
          stripePriceId?: string | null
          updatedAt?: string
        }
        Update: {
          amountCents?: number
          createdAt?: string
          currency?: string
          id?: string
          isActive?: boolean
          lookupKey?: string
          stripePriceId?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      userDailyInsightFeed: {
        Row: {
          articleIds: string[]
          createdAt: string
          feedDate: string
          id: string
          userId: string
        }
        Insert: {
          articleIds: string[]
          createdAt?: string
          feedDate: string
          id?: string
          userId: string
        }
        Update: {
          articleIds?: string[]
          createdAt?: string
          feedDate?: string
          id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "userDailyInsightFeed_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      userMemoryFacts: {
        Row: {
          createdAt: string
          id: string
          lastUpdated: string | null
          openAvoidances: string | null
          peopleInLife: string | null
          statedGoals: string | null
          updatedAt: string
          userId: string
          userInsights: string | null
          userLanguage: string | null
        }
        Insert: {
          createdAt?: string
          id?: string
          lastUpdated?: string | null
          openAvoidances?: string | null
          peopleInLife?: string | null
          statedGoals?: string | null
          updatedAt?: string
          userId: string
          userInsights?: string | null
          userLanguage?: string | null
        }
        Update: {
          createdAt?: string
          id?: string
          lastUpdated?: string | null
          openAvoidances?: string | null
          peopleInLife?: string | null
          statedGoals?: string | null
          updatedAt?: string
          userId?: string
          userInsights?: string | null
          userLanguage?: string | null
        }
        Relationships: []
      }
      userSubscription: {
        Row: {
          billingInterval: string | null
          cancelAtPeriodEnd: boolean
          createdAt: string
          currentPeriodEnd: string | null
          currentPeriodStart: string | null
          endingSoonEmailedAt: string | null
          foundingDiscountEndsAt: string | null
          foundingDiscountForfeitedAt: string | null
          foundingStartedAt: string | null
          gracePeriodEndsAt: string | null
          isFoundingMember: boolean
          lastPaymentFailedAt: string | null
          paymentFailureEmailedAt: string | null
          planTier: string
          scheduledDowngradeEffectiveAt: string | null
          scheduledDowngradeTier: string | null
          status: string
          stripeCustomerId: string | null
          stripePriceId: string | null
          stripeSubscriptionId: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          billingInterval?: string | null
          cancelAtPeriodEnd?: boolean
          createdAt?: string
          currentPeriodEnd?: string | null
          currentPeriodStart?: string | null
          endingSoonEmailedAt?: string | null
          foundingDiscountEndsAt?: string | null
          foundingDiscountForfeitedAt?: string | null
          foundingStartedAt?: string | null
          gracePeriodEndsAt?: string | null
          isFoundingMember?: boolean
          lastPaymentFailedAt?: string | null
          paymentFailureEmailedAt?: string | null
          planTier?: string
          scheduledDowngradeEffectiveAt?: string | null
          scheduledDowngradeTier?: string | null
          status?: string
          stripeCustomerId?: string | null
          stripePriceId?: string | null
          stripeSubscriptionId?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          billingInterval?: string | null
          cancelAtPeriodEnd?: boolean
          createdAt?: string
          currentPeriodEnd?: string | null
          currentPeriodStart?: string | null
          endingSoonEmailedAt?: string | null
          foundingDiscountEndsAt?: string | null
          foundingDiscountForfeitedAt?: string | null
          foundingStartedAt?: string | null
          gracePeriodEndsAt?: string | null
          isFoundingMember?: boolean
          lastPaymentFailedAt?: string | null
          paymentFailureEmailedAt?: string | null
          planTier?: string
          scheduledDowngradeEffectiveAt?: string | null
          scheduledDowngradeTier?: string | null
          status?: string
          stripeCustomerId?: string | null
          stripePriceId?: string | null
          stripeSubscriptionId?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      wixWebhookEvent: {
        Row: {
          id: string
          receivedAt: string
          type: string
        }
        Insert: {
          id: string
          receivedAt?: string
          type: string
        }
        Update: {
          id?: string
          receivedAt?: string
          type?: string
        }
        Relationships: []
      }
      workplace: {
        Row: {
          billingModel: string
          billingNotes: string | null
          billingPeriod: string | null
          contactEmail: string | null
          contractEndDate: string
          contractStartDate: string
          contractTier: string
          createdAt: string
          id: string
          invoiceStatus: string
          isActive: boolean
          maxSeats: number | null
          name: string | null
          paymentMethod: string
          price: number | null
          seatCount: number
          updatedAt: string
        }
        Insert: {
          billingModel?: string
          billingNotes?: string | null
          billingPeriod?: string | null
          contactEmail?: string | null
          contractEndDate: string
          contractStartDate: string
          contractTier?: string
          createdAt?: string
          id?: string
          invoiceStatus?: string
          isActive?: boolean
          maxSeats?: number | null
          name?: string | null
          paymentMethod?: string
          price?: number | null
          seatCount?: number
          updatedAt?: string
        }
        Update: {
          billingModel?: string
          billingNotes?: string | null
          billingPeriod?: string | null
          contactEmail?: string | null
          contractEndDate?: string
          contractStartDate?: string
          contractTier?: string
          createdAt?: string
          id?: string
          invoiceStatus?: string
          isActive?: boolean
          maxSeats?: number | null
          name?: string | null
          paymentMethod?: string
          price?: number | null
          seatCount?: number
          updatedAt?: string
        }
        Relationships: []
      }
      workplaceEnrollmentCode: {
        Row: {
          code: string
          createdAt: string
          createdByUserId: string | null
          deactivatedAt: string | null
          id: string
          isActive: boolean
          workplaceId: string
        }
        Insert: {
          code: string
          createdAt?: string
          createdByUserId?: string | null
          deactivatedAt?: string | null
          id?: string
          isActive?: boolean
          workplaceId: string
        }
        Update: {
          code?: string
          createdAt?: string
          createdByUserId?: string | null
          deactivatedAt?: string | null
          id?: string
          isActive?: boolean
          workplaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplaceEnrollmentCode_workplaceId_fkey"
            columns: ["workplaceId"]
            isOneToOne: false
            referencedRelation: "workplace"
            referencedColumns: ["id"]
          },
        ]
      }
      workplaceInvitation: {
        Row: {
          acceptedAt: string | null
          cancelledAt: string | null
          createdAt: string
          email: string
          grantHr: boolean
          grantManager: boolean
          id: string
          invitedByUserId: string
          status: string
          workplaceId: string
        }
        Insert: {
          acceptedAt?: string | null
          cancelledAt?: string | null
          createdAt?: string
          email: string
          grantHr?: boolean
          grantManager?: boolean
          id?: string
          invitedByUserId: string
          status?: string
          workplaceId: string
        }
        Update: {
          acceptedAt?: string | null
          cancelledAt?: string | null
          createdAt?: string
          email?: string
          grantHr?: boolean
          grantManager?: boolean
          id?: string
          invitedByUserId?: string
          status?: string
          workplaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplaceInvitation_workplaceId_fkey"
            columns: ["workplaceId"]
            isOneToOne: false
            referencedRelation: "workplace"
            referencedColumns: ["id"]
          },
        ]
      }
      workplaceMemberRole: {
        Row: {
          createdAt: string
          id: string
          role: string
          userId: string
          workplaceId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          role: string
          userId: string
          workplaceId: string
        }
        Update: {
          createdAt?: string
          id?: string
          role?: string
          userId?: string
          workplaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplaceMemberRole_workplaceId_fkey"
            columns: ["workplaceId"]
            isOneToOne: false
            referencedRelation: "workplace"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abort_my_one_on_one_booking_redirect: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      admin_adjust_premium_credits: {
        Args: { p_delta: number; p_note: string; p_user_id: string }
        Returns: Json
      }
      admin_cancel_group_coaching_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      admin_create_group_coaching_sessions: {
        Args: {
          p_capacity?: number
          p_description: string
          p_duration_minutes?: number
          p_recurrence_weeks?: number
          p_starts_at: string
          p_title: string
        }
        Returns: Json
      }
      admin_delete_specialist_availability: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_list_coaching_bookings: {
        Args: {
          p_from?: string
          p_limit?: number
          p_session_type?: string
          p_specialist_id?: string
          p_status?: string
          p_to?: string
          p_user_query?: string
        }
        Returns: Json
      }
      admin_reassign_coach_booking_specialist: {
        Args: { p_booking_id: string; p_specialist_id: string }
        Returns: Json
      }
      admin_set_coach_booking_email: {
        Args: {
          p_assigned_coach_email: string
          p_booking_id: string
          p_booking_table?: string
        }
        Returns: undefined
      }
      admin_set_profile_active: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_set_specialist_active: {
        Args: { p_is_active: boolean; p_specialist_id: string }
        Returns: Json
      }
      admin_set_user_referral_partner: {
        Args: { p_partner_id?: string; p_user_id: string }
        Returns: undefined
      }
      admin_update_group_coaching_session: {
        Args: {
          p_capacity?: number
          p_description?: string
          p_duration_minutes?: number
          p_session_id: string
          p_starts_at?: string
          p_title?: string
        }
        Returns: Json
      }
      admin_upsert_specialist_availability: {
        Args: {
          p_duration_minutes?: number
          p_ends_at: string
          p_id: string
          p_specialist_id: string
          p_starts_at: string
        }
        Returns: string
      }
      admin_workplace_monthly_active_users: {
        Args: { p_month: number; p_year: number }
        Returns: {
          active_count: number
          billing_model: string
          billing_period: string
          enrolled_count: number
          max_seats: number
          price: number
          seat_count: number
          workplace_id: string
          workplace_name: string
        }[]
      }
      apply_pending_workplace_invitations: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
      assign_workplace_member_by_email: {
        Args: { p_email: string; p_workplace_id: string }
        Returns: Json
      }
      assign_workplace_member_to_workplace: {
        Args: { p_target_user_id: string; p_workplace_id: string }
        Returns: Json
      }
      available_premium_credits: {
        Args: { p_user_id: string }
        Returns: number
      }
      billing_apply_scheduled_downgrade: {
        Args: { p_user_id: string }
        Returns: Json
      }
      billing_attach_stripe_customer: {
        Args: { p_stripe_customer_id: string; p_user_id: string }
        Returns: undefined
      }
      billing_cancel_scheduled_downgrade: {
        Args: { p_user_id: string }
        Returns: Json
      }
      billing_convert_founding_to_standard: {
        Args: { p_user_id: string }
        Returns: Json
      }
      billing_ensure_premium_signup_credits: {
        Args: { p_user_id: string }
        Returns: Json
      }
      billing_expire_premium_credits: {
        Args: { p_note?: string; p_user_id: string }
        Returns: Json
      }
      billing_expire_subscription: {
        Args: { p_user_id: string }
        Returns: Json
      }
      billing_forfeit_founding_discount: {
        Args: { p_user_id: string }
        Returns: Json
      }
      billing_grant_premium_credit: {
        Args: {
          p_note?: string
          p_stripe_invoice_id: string
          p_user_id: string
        }
        Returns: Json
      }
      billing_insert_capped_credit_grant: {
        Args: {
          p_delta: number
          p_note?: string
          p_reason: string
          p_require_premium?: boolean
          p_stripe_invoice_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      billing_list_lifecycle_due: {
        Args: { p_ending_soon_within?: string; p_limit?: number }
        Returns: Json
      }
      billing_mark_lifecycle_notice_sent: {
        Args: { p_kind: string; p_user_id: string }
        Returns: undefined
      }
      billing_mark_payment_failed: {
        Args: { p_grace_period_ends_at: string; p_user_id: string }
        Returns: Json
      }
      billing_release_stale_booking_holds: {
        Args: { p_older_than?: string }
        Returns: Json
      }
      billing_run_monthly_premium_credit_accrual: {
        Args: { p_as_of?: string }
        Returns: Json
      }
      billing_schedule_downgrade: {
        Args: {
          p_effective_at: string
          p_target_tier: string
          p_user_id: string
        }
        Returns: Json
      }
      billing_set_cancel_at_period_end: {
        Args: { p_cancel: boolean; p_user_id: string }
        Returns: Json
      }
      billing_start_founding_member: {
        Args: { p_started_at?: string; p_user_id: string }
        Returns: Json
      }
      billing_sync_stripe_subscription: {
        Args: {
          p_billing_interval: string
          p_cancel_at_period_end: boolean
          p_current_period_end: string
          p_current_period_start: string
          p_plan_tier: string
          p_status: string
          p_stripe_customer_id?: string
          p_stripe_price_id?: string
          p_stripe_subscription_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      can_i_reassess_now: { Args: never; Returns: boolean }
      can_manage_workplace_members: {
        Args: { p_workplace_id: string }
        Returns: boolean
      }
      cancel_group_coaching_enrollment: {
        Args: { p_session_id: string }
        Returns: Json
      }
      cancel_one_on_one_booking: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      cancel_workplace_invitation: {
        Args: { p_invitation_id: string; p_workplace_id: string }
        Returns: Json
      }
      claim_founding_member_slot: {
        Args: { p_user_id: string }
        Returns: number
      }
      claim_group_coaching_offer: {
        Args: { p_session_id: string }
        Returns: Json
      }
      coach_booking_duration_minutes: { Args: never; Returns: number }
      coaching_insight_article_match_score: {
        Args: {
          p_classification_key: string
          p_nervous_system: string
          p_primary_pillar: string
          p_user_classification: string
          p_user_nervous: string
          p_user_pillar: string
        }
        Returns: number
      }
      coaching_insight_article_matches_user: {
        Args: {
          p_classification_key: string
          p_nervous_system: string
          p_primary_pillar: string
          p_user_classification: string
          p_user_nervous: string
          p_user_pillar: string
        }
        Returns: boolean
      }
      complete_ended_coach_bookings: { Args: never; Returns: number }
      confirm_one_on_one_booking: {
        Args: {
          p_duration_minutes?: number
          p_slot_start: string
          p_specialist_id?: string
        }
        Returns: Json
      }
      consume_chat_session: {
        Args: {
          p_conversation_id: string
          p_record?: boolean
          p_user_id: string
        }
        Returns: Json
      }
      consume_edge_rate_limit: {
        Args: {
          p_bucket: string
          p_max_attempts?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      count_my_referral_signups: { Args: never; Returns: number }
      count_workplace_active_seats: {
        Args: { p_workplace_id: string }
        Returns: number
      }
      count_workplace_period_active_users: {
        Args: { p_month?: number; p_workplace_id: string; p_year?: number }
        Returns: number
      }
      credits_per_one_on_one_session: { Args: never; Returns: number }
      effective_user_tier: { Args: { p_user_id: string }; Returns: string }
      enroll_profile_in_workplace: {
        Args: { p_target_user_id: string; p_workplace_id: string }
        Returns: Json
      }
      founding_member_slot_limit: { Args: never; Returns: number }
      founding_member_slots_remaining: { Args: never; Returns: number }
      get_my_daily_insight_feed: {
        Args: never
        Returns: {
          body: string
          id: string
          summary: string
          title: string
        }[]
      }
      get_my_group_session_status: { Args: never; Returns: Json }
      get_my_last_one_on_one_coach: { Args: never; Returns: Json }
      get_my_subscription_overview: { Args: never; Returns: Json }
      group_coaching_period_month: { Args: { p_at?: string }; Returns: string }
      group_session_registered_count: {
        Args: { p_session_id: string }
        Returns: number
      }
      group_sessions_monthly_limit_message: {
        Args: { p_as_of?: string }
        Returns: string
      }
      group_sessions_next_available_date_label: {
        Args: { p_as_of?: string }
        Returns: string
      }
      i_have_success_plan_addon: { Args: never; Returns: boolean }
      invoke_scheduled_edge_function: {
        Args: { function_slug: string }
        Returns: number
      }
      is_settings_admin: { Args: never; Returns: boolean }
      is_workplace_hr_contact: {
        Args: { p_workplace_id: string }
        Returns: boolean
      }
      join_group_coaching_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      list_active_coaches_for_booking: {
        Args: never
        Returns: {
          bio: string
          id: string
          imageUrl: string
          name: string
        }[]
      }
      list_bookable_one_on_one_slots: {
        Args: { p_from: string; p_specialist_id: string; p_to: string }
        Returns: {
          durationMinutes: number
          slotEnd: string
          slotStart: string
        }[]
      }
      list_bookable_one_on_one_slots_any_coach: {
        Args: { p_from: string; p_to: string }
        Returns: {
          durationMinutes: number
          slotEnd: string
          slotStart: string
        }[]
      }
      list_my_group_coaching_enrollments: { Args: never; Returns: Json }
      list_my_one_on_one_bookings: {
        Args: { p_limit?: number }
        Returns: {
          coachSessionNotes: string
          createdAt: string
          durationMinutes: number
          id: string
          kotaRead: string
          meetLink: string
          scheduledAt: string
          specialistId: string
          specialistName: string
          status: string
          userId: string
        }[]
      }
      list_my_premium_credit_history: {
        Args: { p_limit?: number }
        Returns: Json
      }
      list_my_previous_one_on_one_coaches: {
        Args: never
        Returns: {
          bio: string
          id: string
          imageUrl: string
          isActive: boolean
          lastSessionAt: string
          name: string
        }[]
      }
      list_path_session_steps: {
        Args: { p_path_id: string }
        Returns: {
          id: string
          index: number
          title: string
        }[]
      }
      list_upcoming_group_coaching_sessions: { Args: never; Returns: Json }
      list_workplace_member_ops_profiles: {
        Args: { p_workplace_id: string }
        Returns: {
          email: string
          enrollmentDate: string
          firstName: string
          id: string
          isActive: boolean
          lastName: string
          managesATeam: boolean
        }[]
      }
      my_can_access_path: { Args: { p_path_id: string }; Returns: boolean }
      my_effective_tier: { Args: never; Returns: string }
      my_premium_credit_balance: { Args: never; Returns: number }
      my_tier_allows: { Args: { p_required_tier: string }; Returns: boolean }
      path_is_success_plan: { Args: { p_path_id: string }; Returns: boolean }
      path_required_tier: { Args: { p_path_id: string }; Returns: string }
      path_session_required_tier: {
        Args: { p_session_id: string }
        Returns: string
      }
      peek_coach_post_session: { Args: { p_token: string }; Returns: Json }
      peek_workplace_enrollment_code: {
        Args: { p_code: string }
        Returns: Json
      }
      pick_specialist_for_one_on_one_slot: {
        Args: { p_duration_minutes: number; p_slot_start: string }
        Returns: {
          specialist_email: string
          specialist_id: string
        }[]
      }
      platform_ai_topics_within_limit: {
        Args: { topics: string[] }
        Returns: boolean
      }
      premium_credit_balance_cap: { Args: never; Returns: number }
      premium_credit_room: { Args: { p_user_id: string }; Returns: number }
      process_group_coaching_waitlist: { Args: never; Returns: Json }
      profiles_role_value_is_admin: {
        Args: { p_value: string }
        Returns: boolean
      }
      promote_next_group_waitlist: {
        Args: { p_session_id: string }
        Returns: string
      }
      redeem_premium_credits_for_booking: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      redeem_workplace_enrollment_code: {
        Args: { p_code: string }
        Returns: Json
      }
      release_one_on_one_booking_hold: {
        Args: { p_booking_id: string; p_note?: string }
        Returns: Json
      }
      request_group_session_booking: { Args: never; Returns: Json }
      request_one_on_one_booking: {
        Args: { p_scheduled_at?: string }
        Returns: Json
      }
      reset_group_sessions_used_this_month: {
        Args: { p_as_of?: string }
        Returns: Json
      }
      service_reset_to_individual_free: {
        Args: { p_user_id: string }
        Returns: Json
      }
      set_workplace_member_role: {
        Args: {
          p_enabled: boolean
          p_role: string
          p_target_user_id: string
          p_workplace_id: string
        }
        Returns: Json
      }
      submit_coach_post_session: {
        Args: { p_notes: string; p_token: string }
        Returns: Json
      }
      subscription_effective_tier: {
        Args: {
          p_current_period_end: string
          p_grace_period_ends_at: string
          p_now?: string
          p_plan_tier: string
          p_scheduled_downgrade_effective_at: string
          p_scheduled_downgrade_tier: string
          p_status: string
        }
        Returns: string
      }
      sync_workplace_hr_contact_enrollment: {
        Args: { p_workplace_id: string }
        Returns: undefined
      }
      sync_workplace_hr_contact_enrollment_for_email: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
      tier_rank: { Args: { p_tier: string }; Returns: number }
      unassign_workplace_member: {
        Args: { p_target_user_id: string; p_workplace_id: string }
        Returns: Json
      }
      user_can_access_path: {
        Args: { p_path_id: string; p_user_id: string }
        Returns: boolean
      }
      user_can_reassess_now: {
        Args: { p_now?: string; p_user_id?: string }
        Returns: boolean
      }
      user_has_hr_success_plan_assignment: {
        Args: { p_path_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_success_plan_addon: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      usercanaccesspathquestion: {
        Args: { question_id: string }
        Returns: boolean
      }
      usercanaccesspathsession: {
        Args: { session_id: string }
        Returns: boolean
      }
      userhaspremiumtier: { Args: never; Returns: boolean }
      userownschatconversation: {
        Args: { conversation_id: string }
        Returns: boolean
      }
      userownsrow: { Args: { owner: string }; Returns: boolean }
      wix_process_coach_booking_event: {
        Args: {
          p_contact_email?: string
          p_event_id: string
          p_event_slug: string
          p_internal_booking_id?: string
          p_wix_booking_id: string
        }
        Returns: Json
      }
      wix_resolve_coach_booking: {
        Args: {
          p_contact_email?: string
          p_internal_booking_id?: string
          p_wix_booking_id: string
        }
        Returns: string
      }
      workplace_hard_seat_limit: {
        Args: {
          p_billing_model: string
          p_max_seats: number
          p_seat_count: number
        }
        Returns: number
      }
      write_admin_org_audit: {
        Args: {
          p_action: string
          p_actor_user_id: string
          p_field?: string
          p_new_value?: string
          p_old_value?: string
          p_workplace_id: string
        }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
