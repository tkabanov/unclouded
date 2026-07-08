/** Onboarding questionnaire enums sourced from ir/inventory.json option sets */

import type { CustomerRoleSlug } from "./customerProfile";

/** Bubble option sets: customer_alignment_question_os + answer OS */

export const ALIGNMENT_QUESTIONS_OPTION_SET_ID = "customer_alignment_question_os" as const;

export interface OnboardingScaleAnswer {
  bubbleId: string;
  slug: string;
  label: string;
  score: number;
}

export interface OnboardingScaleQuestion {
  field: string;
  bubbleId: string;
  slug: string;
  question: string;
  answers: readonly OnboardingScaleAnswer[];
}

export const ALIGNMENT_QUESTIONS: readonly OnboardingScaleQuestion[] = [
  {
    field: "aq1",
    bubbleId: "bTHhE",
    slug: "how_aligned_do_your_daily_actions_feel_with_your_core_values_right_now_",
    question: "How aligned do your daily actions feel with your core values right now?",
    answers: [
      { bubbleId: "bTHhP", slug: "very_misaligned___i_m_living_in_a_way_that_doesn_t_reflect_who_i_am", label: "Very misaligned — I'm living in a way that doesn't reflect who I am", score: 1 },
      { bubbleId: "bTHhQ", slug: "mostly_misaligned___i_feel_off_track_from_what_matters_to_me", label: "Mostly misaligned — I feel off track from what matters to me", score: 2 },
      { bubbleId: "bTHhU", slug: "somewhat_aligned___some_things_fit__others_feel_off", label: "Somewhat aligned — some things fit, others feel off", score: 3 },
      { bubbleId: "bTHhV", slug: "mostly_aligned___my_life_generally_reflects_my_values", label: "Mostly aligned — my life generally reflects my values", score: 4 },
      { bubbleId: "bTHhW", slug: "fully_aligned___how_i_live_reflects_who_i_am_and_what_i_believe", label: "Fully aligned — how I live reflects who I am and what I believe", score: 5 },
    ],
  },
  {
    field: "aq2",
    bubbleId: "bTHhI",
    slug: "how_sustainable_are_your_current_daily_habits_and_routines_",
    question: "How sustainable are your current daily habits and routines?",
    answers: [
      { bubbleId: "bTHhb", slug: "not_sustainable___i_have_no_real_structure_and_it_s_catching_up_with_me", label: "Not sustainable — I have no real structure and it's catching up with me", score: 1 },
      { bubbleId: "bTHhc", slug: "barely___i_have_some_routines_but_they_re_fragile", label: "Barely — I have some routines but they're fragile", score: 2 },
      { bubbleId: "bTHhg", slug: "somewhat___i_have_a_foundation_but_need_more_consistency", label: "Somewhat — I have a foundation but need more consistency", score: 3 },
      { bubbleId: "bTHhh", slug: "mostly_sustainable___my_habits_generally_support_me", label: "Mostly sustainable — my habits generally support me", score: 4 },
      { bubbleId: "bTHhi", slug: "very_sustainable___my_routines_are_solid_and_serve_me_well", label: "Very sustainable — my routines are solid and serve me well", score: 5 },
    ],
  },
  {
    field: "aq3",
    bubbleId: "bTHhJ",
    slug: "how_purposeful_does_your_life_feel_right_now_",
    question: "How purposeful does your life feel right now?",
    answers: [
      { bubbleId: "bTHhn", slug: "not_at_all___i_feel_like_i_m_just_going_through_the_motions", label: "Not at all — I feel like I'm just going through the motions", score: 1 },
      { bubbleId: "bTHho", slug: "rarely___i_ve_lost_the_thread_of_what_i_m_working_toward", label: "Rarely — I've lost the thread of what I'm working toward", score: 2 },
      { bubbleId: "bTHhs", slug: "sometimes___i_catch_glimpses_of_purpose_but_it_s_not_consistent", label: "Sometimes — I catch glimpses of purpose but it's not consistent", score: 3 },
      { bubbleId: "bTHht", slug: "often___i_have_a_sense_of_direction_that_guides_most_of_my_choices", label: "Often — I have a sense of direction that guides most of my choices", score: 4 },
      { bubbleId: "bTHhu", slug: "deeply___i_feel_a_clear_sense_of_meaning_and_direction", label: "Deeply — I feel a clear sense of meaning and direction", score: 5 },
    ],
  },
  {
    field: "aq4",
    bubbleId: "bTHhK",
    slug: "how_would_you_rate_your_physical_health_habits_over_the_past_few_weeks___sleep__movement__nutrition_",
    question: "How would you rate your physical health habits over the past few weeks — sleep, movement, nutrition?",
    answers: [
      { bubbleId: "bTHhz", slug: "poor___i_m_neglecting_my_body_and_it_s_showing", label: "Poor — I'm neglecting my body and it's showing", score: 1 },
      { bubbleId: "bTHiA", slug: "below_average___i_know_what_i_need_to_do_but_i_m_not_doing_it", label: "Below average — I know what I need to do but I'm not doing it", score: 2 },
      { bubbleId: "bTHiE", slug: "average___some_areas_are_okay__others_need_work", label: "Average — some areas are okay, others need work", score: 3 },
      { bubbleId: "bTHiF", slug: "good___i_m_taking_care_of_myself_most_of_the_time", label: "Good — I'm taking care of myself most of the time", score: 4 },
      { bubbleId: "bTHiG", slug: "very_good___my_physical_habits_are_a_strength_right_now", label: "Very good — my physical habits are a strength right now", score: 5 },
    ],
  },
  {
    field: "aq5",
    bubbleId: "bTHhO",
    slug: "how_satisfied_are_you_with_the_overall_direction_your_life_is_heading_",
    question: "How satisfied are you with the overall direction your life is heading?",
    answers: [
      { bubbleId: "bTHiL", slug: "very_unsatisfied___i_feel_lost_or_like_things_are_going_the_wrong_way", label: "Very unsatisfied — I feel lost or like things are going the wrong way", score: 1 },
      { bubbleId: "bTHiM", slug: "unsatisfied___i_sense_something_needs_to_change_significantly", label: "Unsatisfied — I sense something needs to change significantly", score: 2 },
      { bubbleId: "bTHiQ", slug: "neutral___not_unhappy__but_not_where_i_want_to_be_either", label: "Neutral — not unhappy, but not where I want to be either", score: 3 },
      { bubbleId: "bTHiR", slug: "satisfied___things_are_generally_moving_in_the_right_direction", label: "Satisfied — things are generally moving in the right direction", score: 4 },
      { bubbleId: "bTHiS", slug: "very_satisfied___i_feel_genuinely_good_about_where_i_m_headed", label: "Very satisfied — I feel genuinely good about where I'm headed", score: 5 },
    ],
  },
] as const;

/** Bubble option sets: customer_performance_question_os + customer_performance_answer_os */

export const PERFORMANCE_QUESTIONS_OPTION_SET_ID = "customer_performance_question_os" as const;
export const PERFORMANCE_ANSWERS_OPTION_SET_ID = "customer_performance_answer_os" as const;

/** 25 role-keyed questions (5 per role) from drsam-99657.bubble → customer_performance_question_os */
export const PERFORMANCE_QUESTIONS_BY_ROLE = {
  pro: [
    {
      field: "pq1",
      bubbleId: "bTHYI",
      slug: "how_clear_are_your_goals_and_priorities_right_now_",
      question: "How clear are your goals and priorities right now?",
      answers: [
      { bubbleId: "bTHZM", slug: "no_clarity___i_don_t_know_what_i_m_working_toward", label: "No clarity — I don't know what I'm working toward", score: 1 },
      { bubbleId: "bTHZQ", slug: "foggy___i_have_a_general_idea_but_it_s_not_defined", label: "Foggy — I have a general idea but it's not defined", score: 2 },
      { bubbleId: "bTHZR", slug: "somewhat_clear___i_know_the_direction_but_not_the_steps", label: "Somewhat clear — I know the direction but not the steps", score: 3 },
      { bubbleId: "bTHZS", slug: "clear___i_have_goals_and_a_rough_plan", label: "Clear — I have goals and a rough plan", score: 4 },
      { bubbleId: "bTHZW", slug: "very_clear___i_have_specific_goals__timelines__and_priorities_locked_in", label: "Very clear — I have specific goals, timelines, and priorities locked in", score: 5 },
      ],
    },
    {
      field: "pq2",
      bubbleId: "bTHYJ",
      slug: "how_consistent_are_you_at_following_through_on_commitments_to_yourself_",
      question: "How consistent are you at following through on commitments to yourself?",
      answers: [
      { bubbleId: "bTHZY", slug: "very_inconsistent___i_rarely_follow_through_on_what_i_plan", label: "Very inconsistent — I rarely follow through on what I plan", score: 1 },
      { bubbleId: "bTHZc", slug: "inconsistent___i_start_strong_but_lose_momentum_quickly", label: "Inconsistent — I start strong but lose momentum quickly", score: 2 },
      { bubbleId: "bTHZd", slug: "somewhat_consistent___i_follow_through_about_half_the_time", label: "Somewhat consistent — I follow through about half the time", score: 3 },
      { bubbleId: "bTHZe", slug: "consistent___i_generally_do_what_i_say_i_will", label: "Consistent — I generally do what I say I will", score: 4 },
      { bubbleId: "bTHZi", slug: "very_consistent___follow_through_is_a_strength_of_mine", label: "Very consistent — follow-through is a strength of mine", score: 5 },
      ],
    },
    {
      field: "pq3",
      bubbleId: "bTHYK",
      slug: "how_effective_do_you_feel_in_your_professional_role_right_now_",
      question: "How effective do you feel in your professional role right now?",
      answers: [
      { bubbleId: "bTHZk", slug: "not_effective___i_feel_stuck_or_like_i_m_falling_behind", label: "Not effective — I feel stuck or like I'm falling behind", score: 1 },
      { bubbleId: "bTHZo", slug: "below_where_i_want_to_be___i_know_i_m_capable_of_more", label: "Below where I want to be — I know I'm capable of more", score: 2 },
      { bubbleId: "bTHZp", slug: "somewhat_effective___doing_okay_but_not_at_my_best", label: "Somewhat effective — doing okay but not at my best", score: 3 },
      { bubbleId: "bTHZq", slug: "effective___performing_well_most_of_the_time", label: "Effective — performing well most of the time", score: 4 },
      { bubbleId: "bTHZu", slug: "highly_effective___operating_at_or_near_my_best", label: "Highly effective — operating at or near my best", score: 5 },
      ],
    },
    {
      field: "pq4",
      bubbleId: "bTHYO",
      slug: "how_often_do_you_feel_productive_versus_just_busy_",
      question: "How often do you feel productive versus just busy?",
      answers: [
      { bubbleId: "bTHZw", slug: "almost_always_just_busy___i_m_exhausted_but_nothing_meaningful_gets_done", label: "Almost always just busy — I'm exhausted but nothing meaningful gets done", score: 1 },
      { bubbleId: "bTHaA", slug: "mostly_busy___i_feel_active_but_not_impactful", label: "Mostly busy — I feel active but not impactful", score: 2 },
      { bubbleId: "bTHaB", slug: "mixed___some_days_are_productive__some_are_just_noise", label: "Mixed — some days are productive, some are just noise", score: 3 },
      { bubbleId: "bTHaC", slug: "usually_productive___i_tend_to_spend_time_on_what_matters", label: "Usually productive — I tend to spend time on what matters", score: 4 },
      { bubbleId: "bTHaG", slug: "consistently_productive___i_protect_my_time_and_focus_well", label: "Consistently productive — I protect my time and focus well", score: 5 },
      ],
    },
    {
      field: "pq5",
      bubbleId: "bTHYP",
      slug: "how_would_you_describe_your_level_of_professional_confidence_right_now_",
      question: "How would you describe your level of professional confidence right now?",
      answers: [
      { bubbleId: "bTHaI", slug: "very_low___i_doubt_myself_constantly_in_professional_situations", label: "Very low — I doubt myself constantly in professional situations", score: 1 },
      { bubbleId: "bTHaM", slug: "low___i_second_guess_myself_more_than_i_should", label: "Low — I second-guess myself more than I should", score: 2 },
      { bubbleId: "bTHaN", slug: "moderate___confident_in_some_areas__shaky_in_others", label: "Moderate — confident in some areas, shaky in others", score: 3 },
      { bubbleId: "bTHaO", slug: "good___i_generally_trust_my_judgment_and_capability", label: "Good — I generally trust my judgment and capability", score: 4 },
      { bubbleId: "bTHaS", slug: "strong___i_show_up_with_confidence_even_under_pressure", label: "Strong — I show up with confidence even under pressure", score: 5 },
      ],
    }
  ] as const,
  student: [
    {
      field: "pq1",
      bubbleId: "bTHYU",
      slug: "how_clear_are_you_on_what_you_re_working_toward_academically_right_now_",
      question: "How clear are you on what you're working toward academically right now?",
      answers: [
      { bubbleId: "bTHaY", slug: "no_clarity___i_don_t_know_why_i_m_here_or_what_i_m_working_toward", label: "No clarity — I don't know why I'm here or what I'm working toward", score: 1 },
      { bubbleId: "bTHaZ", slug: "foggy___i_have_a_general_idea_but_haven_t_defined_it", label: "Foggy — I have a general idea but haven't defined it", score: 2 },
      { bubbleId: "bTHaa", slug: "somewhat_clear___i_know_the_direction_but_not_the_path", label: "Somewhat clear — I know the direction but not the path", score: 3 },
      { bubbleId: "bTHae", slug: "clear___i_have_academic_goals_and_a_rough_plan", label: "Clear — I have academic goals and a rough plan", score: 4 },
      { bubbleId: "bTHaf", slug: "very_clear___i_know_exactly_what_i_m_working_toward_and_why", label: "Very clear — I know exactly what I'm working toward and why", score: 5 },
      ],
    },
    {
      field: "pq2",
      bubbleId: "bTHYV",
      slug: "how_consistent_are_you_at_keeping_up_with_your_coursework_and_commitments_",
      question: "How consistent are you at keeping up with your coursework and commitments?",
      answers: [
      { bubbleId: "bTHak", slug: "very_inconsistent___i_m_falling_significantly_behind", label: "Very inconsistent — I'm falling significantly behind", score: 1 },
      { bubbleId: "bTHal", slug: "inconsistent___i_start_strong_but_lose_momentum_quickly0", label: "Inconsistent — I start strong but lose momentum quickly", score: 2 },
      { bubbleId: "bTHam", slug: "somewhat_consistent___i_manage_about_half_the_time", label: "Somewhat consistent — I manage about half the time", score: 3 },
      { bubbleId: "bTHaq", slug: "consistent___i_generally_keep_up_with_what_s_expected", label: "Consistent — I generally keep up with what's expected", score: 4 },
      { bubbleId: "bTHar", slug: "very_consistent___i_stay_on_top_of_everything_and_ahead_where_i_can", label: "Very consistent — I stay on top of everything and ahead where I can", score: 5 },
      ],
    },
    {
      field: "pq3",
      bubbleId: "bTHYW",
      slug: "how_effective_do_you_feel_as_a_student_right_now_",
      question: "How effective do you feel as a student right now?",
      answers: [
      { bubbleId: "bTHaw", slug: "not_effective___i_feel_like_i_m_failing_or_barely_surviving", label: "Not effective — I feel like I'm failing or barely surviving", score: 1 },
      { bubbleId: "bTHax", slug: "below_where_i_want_to_be___i_know_i_m_capable_of_more0", label: "Below where I want to be — I know I'm capable of more", score: 2 },
      { bubbleId: "bTHay", slug: "somewhat_effective___getting_by_but_not_at_my_best", label: "Somewhat effective — getting by but not at my best", score: 3 },
      { bubbleId: "bTHbC", slug: "effective___performing_well_most_of_the_time0", label: "Effective — performing well most of the time", score: 4 },
      { bubbleId: "bTHbD", slug: "highly_effective___operating_at_or_near_my_full_capacity", label: "Highly effective — operating at or near my full capacity", score: 5 },
      ],
    },
    {
      field: "pq4",
      bubbleId: "bTHYa",
      slug: "how_often_does_your_study_time_feel_genuinely_productive_versus_just_time_spent_",
      question: "How often does your study time feel genuinely productive versus just time spent?",
      answers: [
      { bubbleId: "bTHbI", slug: "almost_never___i_sit_down_but_nothing_really_happens", label: "Almost never — I sit down but nothing really happens", score: 1 },
      { bubbleId: "bTHbJ", slug: "rarely___i_feel_like_i_m_going_through_the_motions", label: "Rarely — I feel like I'm going through the motions", score: 2 },
      { bubbleId: "bTHbK", slug: "sometimes___some_sessions_work__others_don_t", label: "Sometimes — some sessions work, others don't", score: 3 },
      { bubbleId: "bTHbO", slug: "usually___i_tend_to_make_good_use_of_my_time", label: "Usually — I tend to make good use of my time", score: 4 },
      { bubbleId: "bTHbP", slug: "consistently___i_protect_my_focus_and_it_shows_in_my_work", label: "Consistently — I protect my focus and it shows in my work", score: 5 },
      ],
    },
    {
      field: "pq5",
      bubbleId: "bTHYb",
      slug: "how_would_you_describe_your_academic_confidence_right_now_",
      question: "How would you describe your academic confidence right now?",
      answers: [
      { bubbleId: "bTHbU", slug: "very_low___i_doubt_my_ability_to_succeed_most_of_the_time", label: "Very low — I doubt my ability to succeed most of the time", score: 1 },
      { bubbleId: "bTHbV", slug: "low___i_second_guess_myself_more_than_i_should0", label: "Low — I second-guess myself more than I should", score: 2 },
      { bubbleId: "bTHbW", slug: "moderate___confident_in_some_subjects__shaky_in_others", label: "Moderate — confident in some subjects, shaky in others", score: 3 },
      { bubbleId: "bTHba", slug: "good___i_generally_trust_my_ability_and_judgment", label: "Good — I generally trust my ability and judgment", score: 4 },
      { bubbleId: "bTHbb", slug: "strong___i_back_myself_even_in_challenging_academic_situations", label: "Strong — I back myself even in challenging academic situations", score: 5 },
      ],
    }
  ] as const,
  caregiver: [
    {
      field: "pq1",
      bubbleId: "bTHYg",
      slug: "how_clear_are_you_on_your_priorities_and_what_matters_most_in_your_role_right_now_",
      question: "How clear are you on your priorities and what matters most in your role right now?",
      answers: [
      { bubbleId: "bTHbh", slug: "no_clarity___most_days_feel_reactive_with_no_sense_of_direction", label: "No clarity — most days feel reactive with no sense of direction", score: 1 },
      { bubbleId: "bTHbi", slug: "foggy___i_know_what_needs_doing_but_not_what_actually_matters_most", label: "Foggy — I know what needs doing but not what actually matters most", score: 2 },
      { bubbleId: "bTHbm", slug: "somewhat_clear___i_have_priorities_but_they_shift_constantly", label: "Somewhat clear — I have priorities but they shift constantly", score: 3 },
      { bubbleId: "bTHbn", slug: "clear___i_have_a_good_sense_of_what_i_m_focused_on", label: "Clear — I have a good sense of what I'm focused on", score: 4 },
      { bubbleId: "bTHbo", slug: "very_clear___i_know_exactly_what_i_m_working_toward_day_to_day", label: "Very clear — I know exactly what I'm working toward day to day", score: 5 },
      ],
    },
    {
      field: "pq2",
      bubbleId: "bTHYh",
      slug: "how_consistent_are_you_at_following_through_on_your_intentions_for_the_day_",
      question: "How consistent are you at following through on your intentions for the day?",
      answers: [
      { bubbleId: "bTHbt", slug: "very_inconsistent___most_days_go_sideways_before_they_start", label: "Very inconsistent — most days go sideways before they start", score: 1 },
      { bubbleId: "bTHbu", slug: "inconsistent___i_plan_but_rarely_execute_the_way_i_intended", label: "Inconsistent — I plan but rarely execute the way I intended", score: 2 },
      { bubbleId: "bTHby", slug: "somewhat_consistent___i_manage_about_half_the_time0", label: "Somewhat consistent — I manage about half the time", score: 3 },
      { bubbleId: "bTHbz", slug: "consistent___i_generally_do_what_i_set_out_to_do", label: "Consistent — I generally do what I set out to do", score: 4 },
      { bubbleId: "bTHcA", slug: "very_consistent___follow_through_is_a_real_strength_in_my_role", label: "Very consistent — follow-through is a real strength in my role", score: 5 },
      ],
    },
    {
      field: "pq3",
      bubbleId: "bTHYi",
      slug: "how_effective_do_you_feel_in_your_role_as_a_caregiver_or_parent_right_now_",
      question: "How effective do you feel in your role as a caregiver or parent right now?",
      answers: [
      { bubbleId: "bTHcF", slug: "not_effective___i_feel_like_i_m_failing_those_who_depend_on_me", label: "Not effective — I feel like I'm failing those who depend on me", score: 1 },
      { bubbleId: "bTHcG", slug: "below_where_i_want_to_be___i_know_i_have_more_to_give", label: "Below where I want to be — I know I have more to give", score: 2 },
      { bubbleId: "bTHcK", slug: "somewhat_effective___doing_okay_but_running_low", label: "Somewhat effective — doing okay but running low", score: 3 },
      { bubbleId: "bTHcL", slug: "effective___showing_up_well_for_my_family_most_of_the_time", label: "Effective — showing up well for my family most of the time", score: 4 },
      { bubbleId: "bTHcM", slug: "highly_effective___i_feel_genuinely_good_about_how_i_m_showing_up", label: "Highly effective — I feel genuinely good about how I'm showing up", score: 5 },
      ],
    },
    {
      field: "pq4",
      bubbleId: "bTHYm",
      slug: "how_often_do_you_feel_like_you_re_making_real_progress_versus_just_keeping_up_",
      question: "How often do you feel like you're making real progress versus just keeping up?",
      answers: [
      { bubbleId: "bTHcR", slug: "almost_never___every_day_is_just_survival_mode", label: "Almost never — every day is just survival mode", score: 1 },
      { bubbleId: "bTHcS", slug: "rarely___i_m_reacting_more_than_i_m_moving_forward", label: "Rarely — I'm reacting more than I'm moving forward", score: 2 },
      { bubbleId: "bTHcW", slug: "sometimes___occasional_moments_of_progress_between_the_chaos", label: "Sometimes — occasional moments of progress between the chaos", score: 3 },
      { bubbleId: "bTHcX", slug: "often___i_feel_like_things_are_generally_moving_in_the_right_direction", label: "Often — I feel like things are generally moving in the right direction", score: 4 },
      { bubbleId: "bTHcY", slug: "consistently___i_make_meaningful_progress_regularly", label: "Consistently — I make meaningful progress regularly", score: 5 },
      ],
    },
    {
      field: "pq5",
      bubbleId: "bTHYn",
      slug: "how_would_you_describe_your_confidence_in_your_ability_to_manage_your_role_right_now_",
      question: "How would you describe your confidence in your ability to manage your role right now?",
      answers: [
      { bubbleId: "bTHcd", slug: "very_low___i_doubt_myself_constantly_and_feel_like_i_m_failing", label: "Very low — I doubt myself constantly and feel like I'm failing", score: 1 },
      { bubbleId: "bTHce", slug: "low___i_question_my_choices_and_approach_more_than_i_should", label: "Low — I question my choices and approach more than I should", score: 2 },
      { bubbleId: "bTHci", slug: "moderate___confident_in_some_areas__uncertain_in_others", label: "Moderate — confident in some areas, uncertain in others", score: 3 },
      { bubbleId: "bTHcj", slug: "good___i_generally_trust_my_instincts_and_judgment", label: "Good — I generally trust my instincts and judgment", score: 4 },
      { bubbleId: "bTHck", slug: "strong___i_back_myself_even_when_things_are_hard", label: "Strong — I back myself even when things are hard", score: 5 },
      ],
    }
  ] as const,
  transition: [
    {
      field: "pq1",
      bubbleId: "bTHYs",
      slug: "how_clear_are_you_on_the_direction_you_want_to_move_toward_",
      question: "How clear are you on the direction you want to move toward?",
      answers: [
      { bubbleId: "bTHcq", slug: "no_clarity___i_genuinely_don_t_know_what_s_next", label: "No clarity — I genuinely don't know what's next", score: 1 },
      { bubbleId: "bTHcu", slug: "foggy___i_have_some_ideas_but_nothing_feels_solid", label: "Foggy — I have some ideas but nothing feels solid", score: 2 },
      { bubbleId: "bTHcv", slug: "somewhat_clear___i_have_a_direction_but_not_a_plan", label: "Somewhat clear — I have a direction but not a plan", score: 3 },
      { bubbleId: "bTHcw", slug: "clear___i_know_what_i_m_moving_toward_and_have_started_taking_steps", label: "Clear — I know what I'm moving toward and have started taking steps", score: 4 },
      { bubbleId: "bTHdA", slug: "very_clear___i_have_a_defined_goal_and_a_concrete_plan_to_get_there", label: "Very clear — I have a defined goal and a concrete plan to get there", score: 5 },
      ],
    },
    {
      field: "pq2",
      bubbleId: "bTHYt",
      slug: "how_consistent_are_you_at_taking_productive_steps_forward_during_this_time_",
      question: "How consistent are you at taking productive steps forward during this time?",
      answers: [
      { bubbleId: "bTHdC", slug: "very_inconsistent___most_days_i_m_stuck_or_going_in_circles", label: "Very inconsistent — most days I'm stuck or going in circles", score: 1 },
      { bubbleId: "bTHdG", slug: "inconsistent___i_have_bursts_of_effort_but_can_t_sustain_them", label: "Inconsistent — I have bursts of effort but can't sustain them", score: 2 },
      { bubbleId: "bTHdH", slug: "somewhat_consistent___i_make_progress_about_half_the_time", label: "Somewhat consistent — I make progress about half the time", score: 3 },
      { bubbleId: "bTHdI", slug: "consistent___i_m_taking_meaningful_steps_most_days", label: "Consistent — I'm taking meaningful steps most days", score: 4 },
      { bubbleId: "bTHdM", slug: "very_consistent___i_m_actively_and_effectively_moving_my_situation_forward", label: "Very consistent — I'm actively and effectively moving my situation forward", score: 5 },
      ],
    },
    {
      field: "pq3",
      bubbleId: "bTHYu",
      slug: "how_effectively_do_you_feel_you_re_navigating_this_transition_",
      question: "How effectively do you feel you're navigating this transition?",
      answers: [
      { bubbleId: "bTHdO", slug: "not_effectively___i_feel_lost__stuck__or_overwhelmed_by_it", label: "Not effectively — I feel lost, stuck, or overwhelmed by it", score: 1 },
      { bubbleId: "bTHdS", slug: "below_where_i_want_to_be___i_m_managing_but_not_really_moving", label: "Below where I want to be — I'm managing but not really moving", score: 2 },
      { bubbleId: "bTHdT", slug: "somewhat_effectively___making_some_progress_but_with_a_lot_of_friction", label: "Somewhat effectively — making some progress but with a lot of friction", score: 3 },
      { bubbleId: "bTHdU", slug: "effectively___handling_this_transition_with_reasonable_clarity", label: "Effectively — handling this transition with reasonable clarity", score: 4 },
      { bubbleId: "bTHdY", slug: "very_effectively___i_feel_in_control_and_making_this_work", label: "Very effectively — I feel in control and making this work", score: 5 },
      ],
    },
    {
      field: "pq4",
      bubbleId: "bTHYy",
      slug: "how_often_do_your_days_feel_purposeful_and_structured_during_this_period_",
      question: "How often do your days feel purposeful and structured during this period?",
      answers: [
      { bubbleId: "bTHda", slug: "almost_never___my_days_feel_empty_or_chaotic", label: "Almost never — my days feel empty or chaotic", score: 1 },
      { bubbleId: "bTHde", slug: "rarely___i_have_little_structure_and_it_s_affecting_me", label: "Rarely — I have little structure and it's affecting me", score: 2 },
      { bubbleId: "bTHdf", slug: "sometimes___some_days_have_purpose__others_feel_aimless", label: "Sometimes — some days have purpose, others feel aimless", score: 3 },
      { bubbleId: "bTHdg", slug: "often___i_ve_created_enough_structure_to_feel_grounded_most_days", label: "Often — I've created enough structure to feel grounded most days", score: 4 },
      { bubbleId: "bTHdk", slug: "consistently___my_days_have_clear_purpose_and_rhythm_even_now", label: "Consistently — my days have clear purpose and rhythm even now", score: 5 },
      ],
    },
    {
      field: "pq5",
      bubbleId: "bTHYz",
      slug: "how_would_you_describe_your_confidence_in_yourself_during_this_transition_",
      question: "How would you describe your confidence in yourself during this transition?",
      answers: [
      { bubbleId: "bTHdm", slug: "very_low___i_m_doubting_my_abilities_and_worth_significantly", label: "Very low — I'm doubting my abilities and worth significantly", score: 1 },
      { bubbleId: "bTHdq", slug: "low___the_uncertainty_is_shaking_my_belief_in_myself", label: "Low — the uncertainty is shaking my belief in myself", score: 2 },
      { bubbleId: "bTHdr", slug: "moderate___some_days_i_feel_capable__others_i_m_not_sure", label: "Moderate — some days I feel capable, others I'm not sure", score: 3 },
      { bubbleId: "bTHds", slug: "good___i_generally_trust_myself_even_in_the_uncertainty", label: "Good — I generally trust myself even in the uncertainty", score: 4 },
      { bubbleId: "bTHdw", slug: "strong___i_back_myself_and_see_this_as_an_opportunity", label: "Strong — I back myself and see this as an opportunity", score: 5 },
      ],
    }
  ] as const,
  retired: [
    {
      field: "pq1",
      bubbleId: "bTHZE",
      slug: "how_clear_are_you_on_what_gives_your_days_meaning_and_purpose_right_now_",
      question: "How clear are you on what gives your days meaning and purpose right now?",
      answers: [
      { bubbleId: "bTHeC", slug: "no_clarity___i_m_struggling_to_find_what_this_chapter_is_for", label: "No clarity — I'm struggling to find what this chapter is for", score: 1 },
      { bubbleId: "bTHeD", slug: "foggy___i_have_some_ideas_but_nothing_feels_anchored", label: "Foggy — I have some ideas but nothing feels anchored", score: 2 },
      { bubbleId: "bTHeE", slug: "somewhat_clear___some_things_give_me_purpose__but_it_s_not_consistent", label: "Somewhat clear — some things give me purpose, but it's not consistent", score: 3 },
      { bubbleId: "bTHeI", slug: "clear___i_have_a_good_sense_of_what_i_value_and_pursue", label: "Clear — I have a good sense of what I value and pursue", score: 4 },
      { bubbleId: "bTHeJ", slug: "very_clear___i_have_a_strong_sense_of_purpose_and_direction_in_this_phase", label: "Very clear — I have a strong sense of purpose and direction in this phase", score: 5 },
      ],
    },
    {
      field: "pq2",
      bubbleId: "bTHZF",
      slug: "how_consistent_are_you_at_engaging_with_the_things_that_matter_most_to_you_",
      question: "How consistent are you at engaging with the things that matter most to you?",
      answers: [
      { bubbleId: "bTHeO", slug: "very_inconsistent___i_rarely_follow_through_on_my_intentions", label: "Very inconsistent — I rarely follow through on my intentions", score: 1 },
      { bubbleId: "bTHeP", slug: "inconsistent___i_intend_to_engage_but_often_don_t", label: "Inconsistent — I intend to engage but often don't", score: 2 },
      { bubbleId: "bTHeQ", slug: "somewhat_consistent___i_engage_meaningfully_about_half_the_time", label: "Somewhat consistent — I engage meaningfully about half the time", score: 3 },
      { bubbleId: "bTHeU", slug: "consistent___i_regularly_invest_time_in_what_matters_to_me", label: "Consistent — I regularly invest time in what matters to me", score: 4 },
      { bubbleId: "bTHeV", slug: "very_consistent___i_am_actively_and_intentionally_engaged_every_day", label: "Very consistent — I am actively and intentionally engaged every day", score: 5 },
      ],
    },
    {
      field: "pq3",
      bubbleId: "bTHZG",
      slug: "how_effective_do_you_feel_at_shaping_this_chapter_of_your_life_",
      question: "How effective do you feel at shaping this chapter of your life?",
      answers: [
      { bubbleId: "bTHea", slug: "not_effective___this_phase_feels_like_it_s_happening_to_me", label: "Not effective — this phase feels like it's happening to me", score: 1 },
      { bubbleId: "bTHeb", slug: "below_where_i_d_like___i_m_not_making_it_what_i_hoped", label: "Below where I'd like — I'm not making it what I hoped", score: 2 },
      { bubbleId: "bTHec", slug: "somewhat_effective___there_are_good_parts_but_i_m_not_fully_there", label: "Somewhat effective — there are good parts but I'm not fully there", score: 3 },
      { bubbleId: "bTHeg", slug: "effective___i_m_creating_a_life_i_generally_feel_good_about", label: "Effective — I'm creating a life I generally feel good about", score: 4 },
      { bubbleId: "bTHeh", slug: "highly_effective___i_m_living_this_phase_with_intention_and_satisfaction", label: "Highly effective — I'm living this phase with intention and satisfaction", score: 5 },
      ],
    },
    {
      field: "pq4",
      bubbleId: "bTHZK",
      slug: "how_often_does_your_time_feel_well_spent_and_meaningful_",
      question: "How often does your time feel well spent and meaningful?",
      answers: [
      { bubbleId: "bTHem", slug: "almost_never___most_days_feel_empty_or_unstructured", label: "Almost never — most days feel empty or unstructured", score: 1 },
      { bubbleId: "bTHen", slug: "rarely___i_m_filling_time_more_than_living_it", label: "Rarely — I'm filling time more than living it", score: 2 },
      { bubbleId: "bTHeo", slug: "sometimes___meaningful_moments_exist_but_aren_t_consistent", label: "Sometimes — meaningful moments exist but aren't consistent", score: 3 },
      { bubbleId: "bTHes", slug: "often___most_days_feel_worthwhile", label: "Often — most days feel worthwhile", score: 4 },
      { bubbleId: "bTHet", slug: "consistently___i_feel_genuinely_good_about_how_i_spend_my_time", label: "Consistently — I feel genuinely good about how I spend my time", score: 5 },
      ],
    },
    {
      field: "pq5",
      bubbleId: "bTHZL",
      slug: "how_would_you_describe_your_sense_of_confidence_and_capability_in_this_phase_",
      question: "How would you describe your sense of confidence and capability in this phase?",
      answers: [
      { bubbleId: "bTHey", slug: "very_low___i_feel_diminished_or_without_purpose", label: "Very low — I feel diminished or without purpose", score: 1 },
      { bubbleId: "bTHez", slug: "low___i_m_questioning_my_relevance_and_capability_more_than_i_d_like", label: "Low — I'm questioning my relevance and capability more than I'd like", score: 2 },
      { bubbleId: "bTHfA", slug: "moderate___confident_in_some_areas__uncertain_about_others", label: "Moderate — confident in some areas, uncertain about others", score: 3 },
      { bubbleId: "bTHfE", slug: "good___i_generally_feel_capable_and_valuable", label: "Good — I generally feel capable and valuable", score: 4 },
      { bubbleId: "bTHfF", slug: "strong___i_bring_real_experience_and_confidence_to_this_chapter", label: "Strong — I bring real experience and confidence to this chapter", score: 5 },
      ],
    }
  ] as const
} as const satisfies Record<CustomerRoleSlug, readonly OnboardingScaleQuestion[]>;

/** Pro-role questions; kept for backward compatibility */
export const PERFORMANCE_QUESTIONS = PERFORMANCE_QUESTIONS_BY_ROLE.pro;

export function getPerformanceQuestionsForRole(role: CustomerRoleSlug): readonly OnboardingScaleQuestion[] {
  return PERFORMANCE_QUESTIONS_BY_ROLE[role];
}

/** Bubble option set: onboarding_performance_screen_texts (role-keyed step heading + caption) */

export const PERFORMANCE_SCREEN_TEXTS_OPTION_SET_ID = "onboarding_performance_screen_texts" as const;

export const PERFORMANCE_STEP_HEADINGS: Record<CustomerRoleSlug, string> = {
  pro: "How you're showing up professionally", // bTHfG
  student: "How you're showing up in your studies", // bTHfK
  caregiver: "How you're showing up in your role at home", // bTHfM
  transition: "How you're navigating this period of change", // bTHfL
  retired: "How you're shaping this chapter", // bTHfQ
};

export const PERFORMANCE_STEP_CAPTIONS: Record<CustomerRoleSlug, string> = {
  pro: "Think about your work, your role, or whatever you consider your professional domain", // bTHfG
  student: "Think about your academic life, coursework, and student role", // bTHfK
  caregiver: "Think about your daily responsibilities as a caregiver, parent, or household manager", // bTHfM
  transition: "Think about how you're managing this transition — your energy, direction, and forward momentum", // bTHfL
  retired: "Think about your daily engagement, purpose, and sense of effectiveness in this phase of life", // bTHfQ
};

export const PERFORMANCE_STEP_HEADING_BUBBLE_IDS: Record<CustomerRoleSlug, string> = {
  pro: "bTHfG",
  student: "bTHfK",
  caregiver: "bTHfM",
  transition: "bTHfL",
  retired: "bTHfQ",
};

export function getPerformanceStepCopyForRole(role: CustomerRoleSlug): {
  heading: string;
  caption: string;
  headingBubbleId: string;
} {
  return {
    heading: PERFORMANCE_STEP_HEADINGS[role],
    caption: PERFORMANCE_STEP_CAPTIONS[role],
    headingBubbleId: PERFORMANCE_STEP_HEADING_BUBBLE_IDS[role],
  };
}

/** Bubble option set: customer_orientation_answer_os */

export const ORIENTATION_ANSWERS_OPTION_SET_ID = "customer_orientation_answer_os" as const;

export const ORIENTATION_ANSWERS: readonly OnboardingScaleAnswer[] = [
  {
    bubbleId: "bTHlj",
    slug: "i_need_to_stabilize___i_m_not_thinking_about_growth_right_now",
    label: "I need to stabilize — I'm not thinking about growth right now",
    score: 1,
  },
  {
    bubbleId: "bTHlk",
    slug: "something_isn_t_working_and_i_need_to_figure_out_what",
    label: "Something isn't working and I need to figure out what",
    score: 2,
  },
  {
    bubbleId: "bTHlo",
    slug: "things_are_okay___i_m_not_sure_i_need_much_to_change",
    label: "Things are okay — I'm not sure I need much to change",
    score: 3,
  },
  {
    bubbleId: "bTHlp",
    slug: "i_want_to_be_meaningfully_further_along_than_i_am_now",
    label: "I want to be meaningfully further along than I am now",
    score: 4,
  },
  {
    bubbleId: "bTHlq",
    slug: "i_m_ready_to_push_hard_to_the_next_level",
    label: "I'm ready to push hard to the next level",
    score: 5,
  },
] as const;


/** Bubble option sets: customer_stability_question_os + answer OS */

export const STABILITY_QUESTIONS_OPTION_SET_ID = "customer_stability_question_os" as const;

export interface OnboardingScaleAnswer {
  bubbleId: string;
  slug: string;
  label: string;
  score: number;
}

export interface OnboardingScaleQuestion {
  field: string;
  bubbleId: string;
  slug: string;
  question: string;
  answers: readonly OnboardingScaleAnswer[];
}

export const STABILITY_QUESTIONS: readonly OnboardingScaleQuestion[] = [
  {
    field: "sq1",
    bubbleId: "bTHSU",
    slug: "how_well_are_you_managing_your_stress_levels_day_to_day_",
    question: "How well are you managing your stress levels day to day?",
    answers: [
      { bubbleId: "bTHSc", slug: "barely_managing___most_days_feel_overwhelming", label: "Barely managing — most days feel overwhelming", score: 1 },
      { bubbleId: "bTHSg", slug: "struggling___stress_is_affecting_my_daily_functioning", label: "Struggling — stress is affecting my daily functioning", score: 2 },
      { bubbleId: "bTHSh", slug: "getting_by___some_days_are_harder_than_others", label: "Getting by — some days are harder than others", score: 3 },
      { bubbleId: "bTHSi", slug: "managing_well___i_have_some_good_tools_and_routines", label: "Managing well — I have some good tools and routines", score: 4 },
      { bubbleId: "bTHSm", slug: "thriving___stress_feels_manageable_and_i_recover_quickly", label: "Thriving — stress feels manageable and I recover quickly", score: 5 },
    ],
  },
  {
    field: "sq2",
    bubbleId: "bTHSV",
    slug: "when_something_unexpected_hits__how_quickly_do_you_recover_emotionally_",
    question: "When something unexpected hits, how quickly do you recover emotionally?",
    answers: [
      { bubbleId: "bTHSn", slug: "i_stay_in_it_for_a_long_time___it_really_takes_me_down", label: "I stay in it for a long time — it really takes me down", score: 1 },
      { bubbleId: "bTHSo", slug: "it_takes_days_or_weeks_to_feel_like_myself_again", label: "It takes days or weeks to feel like myself again", score: 2 },
      { bubbleId: "bTHSs", slug: "i_bounce_back__but_it_takes_real_effort", label: "I bounce back, but it takes real effort", score: 3 },
      { bubbleId: "bTHSt", slug: "i_recover_within_a_day_or_two_most_of_the_time", label: "I recover within a day or two most of the time", score: 4 },
      { bubbleId: "bTHSu", slug: "i_m_resilient___i_process_and_move_forward_relatively_quickly", label: "I'm resilient — I process and move forward relatively quickly", score: 5 },
    ],
  },
  {
    field: "sq3",
    bubbleId: "bTHSW",
    slug: "how_often_do_you_feel_like_you_re_carrying_more_than_you_can_sustainably_hold_",
    question: "How often do you feel like you're carrying more than you can sustainably hold?",
    answers: [
      { bubbleId: "bTHTA", slug: "almost_always___it_feels_like_too_much_nearly_every_day", label: "Almost always — it feels like too much nearly every day", score: 1 },
      { bubbleId: "bTHTE", slug: "often___it_s_my_normal_state_lately", label: "Often — it's my normal state lately", score: 2 },
      { bubbleId: "bTHTF", slug: "sometimes___it_comes_in_waves", label: "Sometimes — it comes in waves", score: 3 },
      { bubbleId: "bTHTG", slug: "rarely___i_feel_mostly_balanced", label: "Rarely — I feel mostly balanced", score: 4 },
      { bubbleId: "bTHTK", slug: "almost_never___my_load_feels_sustainable", label: "Almost never — my load feels sustainable", score: 5 },
    ],
  },
  {
    field: "sq4",
    bubbleId: "bTHSa",
    slug: "how_would_you_rate_your_ability_to_set_and_maintain_boundaries_with_others_",
    question: "How would you rate your ability to set and maintain boundaries with others?",
    answers: [
      { bubbleId: "bTHTM", slug: "very_hard___i_rarely_say_no_and_often_feel_taken_advantage_of", label: "Very hard — I rarely say no and often feel taken advantage of", score: 1 },
      { bubbleId: "bTHTQ", slug: "difficult___i_know_i_need_better_boundaries_but_struggle_to_set_them", label: "Difficult — I know I need better boundaries but struggle to set them", score: 2 },
      { bubbleId: "bTHTR", slug: "moderate___i_m_working_on_it__hit_and_miss", label: "Moderate — I'm working on it, hit and miss", score: 3 },
      { bubbleId: "bTHTS", slug: "good___i_can_usually_hold_my_limits_with_some_discomfort", label: "Good — I can usually hold my limits with some discomfort", score: 4 },
      { bubbleId: "bTHTW", slug: "strong___i_set_and_maintain_boundaries_with_confidence", label: "Strong — I set and maintain boundaries with confidence", score: 5 },
    ],
  },
  {
    field: "sq5",
    bubbleId: "bTHSb",
    slug: "how_supported_do_you_feel_by_your_social_world_right_now___friendships__peers__community_",
    question: "How supported do you feel by your social world right now — friendships, peers, community?",
    answers: [
      { bubbleId: "bTHTY", slug: "very_unsupported___i_feel_alone_even_when_i_m_around_people", label: "Very unsupported — I feel alone even when I'm around people", score: 1 },
      { bubbleId: "bTHTc", slug: "mostly_unsupported___my_social_connections_feel_thin_or_strained", label: "Mostly unsupported — my social connections feel thin or strained", score: 2 },
      { bubbleId: "bTHTd", slug: "somewhat_supported___i_have_some_people_but_it_doesn_t_feel_like_enough", label: "Somewhat supported — I have some people but it doesn't feel like enough", score: 3 },
      { bubbleId: "bTHTe", slug: "supported___i_generally_feel_like_i_have_people_i_can_turn_to", label: "Supported — I generally feel like I have people I can turn to", score: 4 },
      { bubbleId: "bTHTi", slug: "very_supported___my_social_world_feels_rich_and_genuinely_nourishing", label: "Very supported — my social world feels rich and genuinely nourishing", score: 5 },
    ],
  },
] as const;

/** Bubble option sets: customers_load_signal_os + customers_load_signal_question_os */

export const LOAD_SIGNAL_QUESTION_OPTION_SET_ID = "customers_load_signal_os" as const;
export const LOAD_SIGNAL_ANSWER_OPTION_SET_ID = "customers_load_signal_question_os" as const;

export interface LoadSignalAnswer {
  bubbleId: string;
  slug: string;
  label: string;
}

export interface LoadSignalQuestion {
  field: string;
  bubbleId: string;
  slug: string;
  question: string;
  answers: readonly LoadSignalAnswer[];
}

export const LOAD_SIGNAL_QUESTIONS: readonly LoadSignalQuestion[] = [
  {
    field: "cognitive_load_signal",
    bubbleId: "bTHlu",
    slug: "how_much_mental_noise_are_you_dealing_with___racing_thoughts__rumination__decision_fatigue_",
    question: "How much mental noise are you dealing with — racing thoughts, rumination, decision fatigue?",
    answers: [
      { bubbleId: "bTHmH", slug: "mind_feels_clear_most_of_the_time", label: "Mind feels clear most of the time" },
      { bubbleId: "bTHmI", slug: "some_noise_but_manageable", label: "Some noise but manageable" },
      { bubbleId: "bTHmM", slug: "head_rarely_feels_quiet___constant", label: "Head rarely feels quiet — constant" },
    ],
  },
  {
    field: "relational_load_signal",
    bubbleId: "bTHlv",
    slug: "how_much_are_your_relationships_adding_to_your_stress_right_now_",
    question: "How much are your relationships adding to your stress right now?",
    answers: [
      { bubbleId: "bTHmO", slug: "relationships_feel_mostly_supportive", label: "Relationships feel mostly supportive" },
      { bubbleId: "bTHmS", slug: "some_friction_but_manageable", label: "Some friction but manageable" },
      { bubbleId: "bTHmT", slug: "significant_conflict_or_strain_in_key_relationships", label: "Significant conflict or strain in key relationships" },
    ],
  },
  {
    field: "environmental_load_signal",
    bubbleId: "bTHlw",
    slug: "how_much_pressure_are_logistics_and_time_creating___schedule__responsibilities__deadlines_",
    question: "How much pressure are logistics and time creating — schedule, responsibilities, deadlines?",
    answers: [
      { bubbleId: "bTHmY", slug: "life_feels_mostly_manageable", label: "Life feels mostly manageable" },
      { bubbleId: "bTHmZ", slug: "stretched_but_coping", label: "Stretched but coping" },
      { bubbleId: "bTHma", slug: "overwhelmed_by_practical_demands", label: "Overwhelmed by practical demands" },
    ],
  },
  {
    field: "financial_load_signal",
    bubbleId: "bTHmA",
    slug: "how_much_is_financial_stress_affecting_your_day_to_day_mental_state_",
    question: "How much is financial stress affecting your day-to-day mental state?",
    answers: [
      { bubbleId: "bTHmf", slug: "financial_situation_feels_stable", label: "Financial situation feels stable" },
      { bubbleId: "bTHmg", slug: "some_financial_worry_but_not_consuming", label: "Some financial worry but not consuming" },
      { bubbleId: "bTHmk", slug: "financial_stress_is_significant_daily_presence", label: "Financial stress is significant daily presence" },
    ],
  },
] as const;

/** Bubble option set: customer_health_question_os (multi-select health flags) */

export const HEALTH_FLAG_OPTION_SET_ID = "customer_health_question_os" as const;

export interface HealthFlagOption {
  bubbleId: string;
  slug: string;
  label: string;
  /** Maps to Bubble page custom state key under bTGNI */
  customStateKey:
    | "health_recovery_mode_active"
    | "health_grief_mode_active"
    | "health_flag3"
    | "health_flag4"
    | "health_flag5"
    | "health_flag6"
    | "health_none_of_the_above";
}

export const HEALTH_FLAG_OPTIONS: readonly HealthFlagOption[] = [
  {
    bubbleId: "bTHuc",
    slug: "i_m_in_recovery_from_substance_use",
    label: "I'm in recovery from substance use",
    customStateKey: "health_recovery_mode_active",
  },
  {
    bubbleId: "bTHud",
    slug: "i_m_navigating_a_significant_loss_or_life_disruption___divorce__bereavement__illness__family_crisis",
    label:
      "I'm navigating a significant loss or life disruption — divorce, bereavement, illness, family crisis",
    customStateKey: "health_grief_mode_active",
  },
  {
    bubbleId: "bTHue",
    slug: "i_m_navigating_an_eating_or_body_image_challenge",
    label: "I'm navigating an eating or body image challenge",
    customStateKey: "health_flag3",
  },
  {
    bubbleId: "bTHui",
    slug: "i_m_managing_a_chronic_health_condition",
    label: "I'm managing a chronic health condition",
    customStateKey: "health_flag4",
  },
  {
    bubbleId: "bTHuj",
    slug: "i_m_supporting_a_family_member_through_something_difficult",
    label: "I'm supporting a family member through something difficult",
    customStateKey: "health_flag5",
  },
  {
    bubbleId: "bTHuk",
    slug: "i_d_prefer_to_share_this_in_coaching_when_i_m_ready",
    label: "I'd prefer to share this in coaching when I'm ready",
    customStateKey: "health_flag6",
  },
  {
    bubbleId: "bTIAe",
    slug: "none_of_the_above",
    label: "None of the above",
    customStateKey: "health_none_of_the_above",
  },
] as const;

/** Frontend health flag payload — mirrors bTGNI custom states + classification fields */
export interface HealthFlagsPayload {
  recovery_mode_active: boolean;
  grief_mode_active: boolean;
  health_flag3: boolean;
  health_flag4: boolean;
  health_flag5: boolean;
  health_flag6: boolean;
  health_none_of_the_above: boolean;
  selected_flags: string[];
}

const NONE_FLAG_SLUG = "none_of_the_above";

export function buildHealthFlagsFromSelection(selectedSlugs: readonly string[]): HealthFlagsPayload {
  const selected = new Set(selectedSlugs);
  const byKey = Object.fromEntries(
    HEALTH_FLAG_OPTIONS.map((opt) => [opt.customStateKey, selected.has(opt.slug)])
  ) as Record<HealthFlagOption["customStateKey"], boolean>;

  return {
    recovery_mode_active: byKey.health_recovery_mode_active,
    grief_mode_active: byKey.health_grief_mode_active,
    health_flag3: byKey.health_flag3,
    health_flag4: byKey.health_flag4,
    health_flag5: byKey.health_flag5,
    health_flag6: byKey.health_flag6,
    health_none_of_the_above: byKey.health_none_of_the_above,
    selected_flags: [...selectedSlugs],
  };
}

export function toggleHealthFlagSelection(
  selected: ReadonlySet<string>,
  slug: string
): Set<string> {
  const next = new Set(selected);
  if (slug === NONE_FLAG_SLUG) {
    if (next.has(NONE_FLAG_SLUG)) {
      next.delete(NONE_FLAG_SLUG);
    } else {
      next.clear();
      next.add(NONE_FLAG_SLUG);
    }
    return next;
  }
  next.delete(NONE_FLAG_SLUG);
  if (next.has(slug)) {
    next.delete(slug);
  } else {
    next.add(slug);
  }
  return next;
}

/** Maps load signal answers to Bubble custom states load_signal_* on bTGNI */
export function buildLoadSignalCustomStates(signals: {
  cognitive_load_signal: string;
  relational_load_signal: string;
  environmental_load_signal: string;
  financial_load_signal: string;
}): Record<string, string> {
  return {
    load_signal_cognitive: signals.cognitive_load_signal,
    load_signal_relational: signals.relational_load_signal,
    load_signal_environmental: signals.environmental_load_signal,
    load_signal_financial: signals.financial_load_signal,
  };
}
