-- PostgREST only sees the public schema. user_roles.user_id referenced
-- auth.users(id) which PostgREST cannot traverse, so embedded selects like
-- profiles(email,full_name,avatar_url) returned 400 PGRST200.
-- Adding a second FK to public.profiles(id) (same value — 1:1 with auth.users)
-- lets PostgREST resolve the relationship automatically.
ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
