INSERT INTO users (id, email, password_hash, role, display_name, created_at) VALUES
  ('u_admin', 'daniel@example.com', 'demo-hash', 'admin', 'Daniel Maldonado', '2026-03-20T09:00:00Z'),
  ('u_host_1', 'maya@example.com', 'demo-hash', 'host', 'Maya Torque', '2026-03-20T09:05:00Z'),
  ('u_official_1', 'riley@example.com', 'demo-hash', 'official', 'Riley Chase', '2026-03-20T09:10:00Z'),
  ('u_participant_1', 'leo@example.com', 'demo-hash', 'participant', 'Leo Drift', '2026-03-20T09:12:00Z'),
  ('u_participant_2', 'nina@example.com', 'demo-hash', 'participant', 'Nina Apex', '2026-03-20T09:13:00Z');

INSERT INTO racer_profiles (id, user_id, first_name, last_name, display_name, garage_name, status, created_at) VALUES
  ('r_maya', 'u_host_1', 'Maya', 'Torque', 'Maya Torque', 'Redline North', 'active', '2026-03-20T10:00:00Z'),
  ('r_leo', 'u_participant_1', 'Leo', 'Drift', 'Leo Drift', 'Thunder Alley', 'active', '2026-03-20T10:02:00Z'),
  ('r_nina', 'u_participant_2', 'Nina', 'Apex', 'Nina Apex', 'Chrome Circuit', 'active', '2026-03-20T10:04:00Z'),
  ('r_jace', NULL, 'Jace', 'Velo', 'Jace Velo', 'Redline North', 'active', '2026-03-20T10:06:00Z');

INSERT INTO cars (id, owner_racer_id, nickname, brand, model, series, model_year, category, class_name, notes, status, created_at) VALUES
  ('c_copper', 'r_maya', 'Copper Comet', 'Hot Wheels', 'Bone Shaker', 'Mainline', 2024, 'Modified', 'A-Class', 'Balanced for lane 3 and 4', 'race_ready', '2026-03-21T08:00:00Z'),
  ('c_blue', 'r_leo', 'Blue Blitz', 'Hot Wheels', 'Twin Mill', 'Mainline', 2025, 'Stock', 'B-Class', 'Consistent rollout in short heats', 'checked_in', '2026-03-21T08:05:00Z'),
  ('c_neon', 'r_nina', 'Neon Apex', 'Hot Wheels', '24 Ours', 'Premium', 2025, 'Stock', 'A-Class', 'Fastest qualifier on test day', 'inspection', '2026-03-21T08:10:00Z'),
  ('c_phantom', 'r_jace', 'Track Phantom', 'Matchbox', 'Lamborghini Gallardo', 'Collectors', 2023, 'Modified', 'A-Class', 'Needs close DQ review on contact calls', 'race_ready', '2026-03-21T08:12:00Z');

INSERT INTO events (id, host_user_id, name, description, event_date, location_name, track_name, track_length_feet, lane_count, status, created_at) VALUES
  ('e_garage_clash', 'u_host_1', 'Saturday Garage Clash', 'Primary live tournament used for Phase 1 validation.', '2026-03-29', 'Brooklyn Track Loft', 'Orange Overpass', 32, 4, 'in_progress', '2026-03-21T12:00:00Z'),
  ('e_family_sprint', 'u_host_1', 'Family Sprint Night', 'Smaller follow-up event for 2-lane testing.', '2026-04-05', 'Queens Home Circuit', 'Basement Dash', 24, 2, 'checkin', '2026-03-21T12:15:00Z');

INSERT INTO event_assignments (id, event_id, user_id, assignment_role, created_at) VALUES
  ('ea_host_garage_clash', 'e_garage_clash', 'u_host_1', 'host', '2026-03-21T12:00:00Z'),
  ('ea_host_family_sprint', 'e_family_sprint', 'u_host_1', 'host', '2026-03-21T12:15:00Z'),
  ('ea_official_garage_clash', 'e_garage_clash', 'u_official_1', 'official', '2026-03-28T18:00:00Z');

INSERT INTO event_registrations (id, event_id, racer_id, car_id, checked_in_at, ready_status, seed, created_at) VALUES
  ('reg_1', 'e_garage_clash', 'r_maya', 'c_copper', '2026-03-29T13:00:00Z', 'ready', 1, '2026-03-23T09:00:00Z'),
  ('reg_2', 'e_garage_clash', 'r_leo', 'c_blue', '2026-03-29T13:01:00Z', 'ready', 4, '2026-03-23T09:01:00Z'),
  ('reg_3', 'e_garage_clash', 'r_nina', 'c_neon', '2026-03-29T13:02:00Z', 'checked_in', 2, '2026-03-23T09:02:00Z'),
  ('reg_4', 'e_garage_clash', 'r_jace', 'c_phantom', '2026-03-29T13:03:00Z', 'ready', 3, '2026-03-23T09:03:00Z'),
  ('reg_5', 'e_family_sprint', 'r_maya', 'c_copper', NULL, 'registered', 1, '2026-03-23T11:00:00Z'),
  ('reg_6', 'e_family_sprint', 'r_leo', 'c_blue', '2026-04-05T16:40:00Z', 'checked_in', 2, '2026-03-23T11:02:00Z');

INSERT INTO tournaments (id, event_id, format, status, generated_at) VALUES
  ('t_garage_clash', 'e_garage_clash', 'single_elimination', 'in_progress', '2026-03-29T13:15:00Z'),
  ('t_family_sprint', 'e_family_sprint', 'single_elimination', 'draft', '2026-04-05T17:00:00Z');

INSERT INTO matches (id, tournament_id, round_number, bracket_position, status, slot_a_registration_id, slot_b_registration_id, winner_registration_id, next_match_id, notes) VALUES
  ('m_qf_1', 't_garage_clash', 1, 1, 'completed', 'reg_1', 'reg_2', 'reg_1', 'm_final_1', 'Lane 3 edge by 18ms'),
  ('m_qf_2', 't_garage_clash', 1, 2, 'completed', 'reg_3', 'reg_4', 'reg_3', 'm_final_1', 'Rerun confirmed before final result'),
  ('m_final_1', 't_garage_clash', 2, 1, 'ready', 'reg_1', 'reg_3', NULL, NULL, 'Championship match queued');

INSERT INTO heats (id, match_id, heat_number, lane_count, status) VALUES
  ('h_qf_1', 'm_qf_1', 1, 4, 'completed'),
  ('h_qf_2', 'm_qf_2', 1, 4, 'completed'),
  ('h_final_1', 'm_final_1', 1, 4, 'ready');

INSERT INTO lane_results (id, heat_id, lane_number, registration_id, elapsed_ms, finish_position, result_status) VALUES
  ('lr_qf_1_1', 'h_qf_1', 1, 'reg_2', 3018, 2, 'finished'),
  ('lr_qf_1_2', 'h_qf_1', 3, 'reg_1', 3000, 1, 'finished'),
  ('lr_qf_2_1', 'h_qf_2', 2, 'reg_4', NULL, 2, 'dq'),
  ('lr_qf_2_2', 'h_qf_2', 4, 'reg_3', 2988, 1, 'finished'),
  ('lr_final_1_1', 'h_final_1', 1, 'reg_1', NULL, NULL, 'pending'),
  ('lr_final_1_2', 'h_final_1', 4, 'reg_3', NULL, NULL, 'pending');

INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, metadata_json, created_at) VALUES
  ('a_1', 'u_host_1', 'match', 'm_qf_1', 'result_recorded', '{"winnerRegistrationId":"reg_1","note":"Manual official entry"}', '2026-03-29T14:18:00Z'),
  ('a_2', 'u_admin', 'match', 'm_qf_2', 'match_corrected', '{"reason":"Rerun confirmed after initial false trigger"}', '2026-03-29T14:31:00Z'),
  ('a_3', 'u_admin', 'user', 'u_official_1', 'role_confirmed', '{"eventId":"e_garage_clash","role":"official"}', '2026-03-29T15:02:00Z');
