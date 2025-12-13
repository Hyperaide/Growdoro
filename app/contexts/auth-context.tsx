"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../../lib/db";
import { id } from "@instantdb/react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import ProfileCreationModal from "../components/ProfileCreationModal";
import LoginModal from "../components/LoginModal";
import {
  trackSignIn,
  trackSignOut,
  trackProfileCreated,
  identifyUser,
} from "@/lib/events";

interface AuthContextType {
  user: any;
  profile: any;
  db: any;
  sessionId: string;
  signOut: () => void;
  isLoading: boolean;
  GoogleSignInButton: (onSuccess?: () => void) => React.JSX.Element | null;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  db: null,
  sessionId: "",
  signOut: () => {},
  isLoading: true,
  GoogleSignInButton: () => null,
  showLoginModal: false,
  setShowLoginModal: () => {},
});

// Get Google Client ID from environment
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
// Google client name should match what's configured in Instant dashboard
const GOOGLE_CLIENT_NAME =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_NAME || "growdoro";

function AuthContextProviderInner({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState("");
  const [showProfileCreation, setShowProfileCreation] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isIdentified, setIsIdentified] = useState(false);
  const { isLoading, user, error } = db.useAuth();

  // Query for user profile
  const { data: profileData } = db.useQuery(
    user
      ? {
          profiles: {
            $: {
              where: {
                "user.id": user.id,
              },
            },
          },
        }
      : null
  );

  const profile = profileData?.profiles?.[0] || null;

  if (user && profile && !isIdentified) {
    setIsIdentified(true);
    identifyUser(user.id, {
      email: user.email,
      username: profile.username,
      name: profile.username, // Use username as name if no other name is available
    });
  }

  // Initialize session ID (for non-authenticated users)
  useEffect(() => {
    const STORAGE_KEY = "gardenspace_session_id";
    let storedSessionId = localStorage.getItem(STORAGE_KEY);

    if (!storedSessionId) {
      storedSessionId = id();
      localStorage.setItem(STORAGE_KEY, storedSessionId);
    }

    setSessionId(storedSessionId);
  }, []);

  // Show profile creation modal when user is authenticated but has no profile
  useEffect(() => {
    if (user && !profile) {
      // Transfer session blocks to authenticated user
      const transferSessionBlocks = async () => {
        try {
          // Query for all blocks belonging to the current session
          const { data } = await db.queryOnce({
            blocks: {
              $: {
                where: {
                  sessionId: sessionId,
                },
              },
            },
          });

          if (data?.blocks && data.blocks.length > 0) {
            // get all the user blocks
            const { data: userBlocks } = await db.queryOnce({
              blocks: {
                $: {
                  where: {
                    "user.id": user.id,
                  },
                },
              },
            });

            // Create transactions to update each block to belong to the user as long as a user block doesnt already exist in x, y, z
            const transactions = data.blocks.map((block) => {
              const userBlock = userBlocks.blocks.find(
                (b: any) =>
                  b.x === block.x && b.y === block.y && b.z === block.z
              );
              if (!userBlock) {
                return db.tx.blocks[block.id].link({
                  user: user.id,
                });
              }
            });

            // Execute all updates in a single transaction
            await db.transact(transactions as any);
            console.log(
              `Transferred ${data.blocks.length} blocks from session to user ${user.id}`
            );
          }
        } catch (error) {
          console.error("Failed to transfer session blocks:", error);
        }
      };

      transferSessionBlocks();
    }

    if (user && !profile && profileData?.profiles !== undefined && !isLoading) {
      setShowProfileCreation(true);
    }
  }, [user, profile, profileData, isLoading, sessionId]);

  const signOut = () => {
    trackSignOut();
    db.auth.signOut();
  };

  // Google Sign In Button Component
  const GoogleSignInButton = (onSuccess?: () => void) => {
    const [nonce] = useState(crypto.randomUUID());

    if (!GOOGLE_CLIENT_ID) {
      return null;
    }

    return (
      <GoogleLogin
        nonce={nonce}
        onError={() => alert("Login failed")}
        onSuccess={({ credential }) => {
          if (!credential) {
            alert("No credential received");
            return;
          }

          db.auth
            .signInWithIdToken({
              clientName: GOOGLE_CLIENT_NAME,
              idToken: credential,
              nonce,
            })
            .then(() => {
              trackSignIn("google");
              // Call the onSuccess callback if provided
              if (onSuccess) {
                onSuccess();
              }
            })
            .catch((err) => {
              alert("Uh oh: " + err.body?.message);
            });
        }}
      />
    );
  };

  return (
    <>
      <AuthContext.Provider
        value={{
          user,
          profile,
          db,
          sessionId,
          signOut,
          isLoading,
          GoogleSignInButton,
          showLoginModal,
          setShowLoginModal,
        }}
      >
        {children}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </AuthContext.Provider>

      {user && (
        <ProfileCreationModal
          isOpen={showProfileCreation}
          onClose={() => setShowProfileCreation(false)}
          userId={user.id}
        />
      )}

      {/* <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            /> */}
    </>
  );
}

export default function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!GOOGLE_CLIENT_ID) {
    console.warn(
      "⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID not set in environment variables"
    );
    // Return the provider without Google OAuth if client ID is not set
    return <AuthContextProviderInner>{children}</AuthContextProviderInner>;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContextProviderInner>{children}</AuthContextProviderInner>
    </GoogleOAuthProvider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthContextProvider");
  }
  return context;
};
