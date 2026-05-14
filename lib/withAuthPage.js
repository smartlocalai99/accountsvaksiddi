import { getUserFromRequest } from "@/lib/auth";
import { canAccessPath } from "@/lib/permissions";

export function withAuthPage(options = {}) {
  const { allowedRoles = null, path = null, getProps = null } = options;

  return async function getServerSideProps(context) {
    const user = await getUserFromRequest(context.req);

    if (!user) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    if (path && !canAccessPath(user.role, path)) {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }

    const extraProps = getProps ? await getProps(context, user) : {};

    return {
      props: {
        ...extraProps,
        user,
      },
    };
  };
}
