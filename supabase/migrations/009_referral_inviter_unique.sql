-- Ensure inviter_id is unique for one invite code per member
create unique index if not exists "ReferralInvite_inviter_id_key"
  on "ReferralInvite" (inviter_id);
