'use client';

import { useParams } from "next/navigation";
import PublicIsometricGarden from "../../components/PublicIsometricGarden";

export default function Page() {
  const params = useParams();
  const username = params.username as string;

  return <PublicIsometricGarden username={username} />;
}