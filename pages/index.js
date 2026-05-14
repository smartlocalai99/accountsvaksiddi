import { getUserFromRequest } from "@/lib/auth";

export async function getServerSideProps(context) {
  const user = await getUserFromRequest(context.req);

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: "/dashboard",
      permanent: false,
    },
  };
}

export default function HomePage() {
  return null;
}
