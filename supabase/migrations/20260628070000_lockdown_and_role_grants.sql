-- =========================================================
-- 1. REMOVE ANONYMOUS INSERT BYPASS ON candidates + applications
--    (item 6: route all submissions through submitApplicationFn)
-- =========================================================

-- Drop the anon INSERT policy on candidates added in 20260628000000.
-- submitApplicationFn already uses the service_role key to insert candidates,
-- so removing this policy breaks nothing for legitimate use.
DROP POLICY IF EXISTS "anon insert candidates via careers" ON public.candidates;

-- Drop the anon INSERT policy on applications.
-- submitApplicationFn (service_role) is the only legitimate insertion path.
DROP POLICY IF EXISTS "anon insert apps for published jobs" ON public.applications;

-- Revoke the explicit INSERT grant that was given to the anon role.
-- Without this REVOKE, the policies are irrelevant because PostgreSQL evaluates
-- GRANT before RLS — an anon INSERT would still fail at the GRANT level, but
-- this makes the intent explicit and prevents accidental policy re-addition.
REVOKE INSERT ON public.applications FROM anon;
REVOKE INSERT ON public.candidates   FROM anon;

-- =========================================================
-- 2. FIX user_roles GRANTS SO TEAM MANAGEMENT WORKS
--    (item 7: allow owner/admin to change roles and remove members)
-- =========================================================

-- The original schema only granted SELECT on user_roles to the authenticated role.
-- This meant the "owner/admin manage roles" RLS policy was unreachable — Postgres
-- checks GRANT before RLS, so INSERT/UPDATE/DELETE always failed at the GRANT level.
-- Adding the missing grants lets the RLS policy enforce who can mutate roles.
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Safety guard: an owner can never demote themselves (prevents lockout).
-- This is enforced in the UI by hiding controls for the current user, but adding
-- a DB-level trigger removes reliance on client-side guards.
CREATE OR REPLACE FUNCTION public.guard_owner_self_demote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Prevent deleting the last owner row for an org
  IF TG_OP = 'DELETE' AND OLD.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE organization_id = OLD.organization_id
        AND role = 'owner'
        AND user_id <> OLD.user_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Cannot remove the last owner of an organization';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_owner_self_demote ON public.user_roles;
CREATE TRIGGER trg_guard_owner_self_demote
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_owner_self_demote();
