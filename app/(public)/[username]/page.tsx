'use client';

import { useParams } from "next/navigation";
import { useEffect } from "react";
import PublicIsometricGarden from "../../components/PublicIsometricGarden";
import { trackPageViewed } from "@/lib/events";

export default function Page() {
  const params = useParams();
  const username = params.username as string;

  useEffect(() => {
    trackPageViewed("public_profile", { username });
  }, [username]);

  return <PublicIsometricGarden username={username} />;
}