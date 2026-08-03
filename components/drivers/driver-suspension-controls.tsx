"use client";

import { AlertTriangle, LoaderCircle, RotateCcw, ShieldOff, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { useAuth } from "@/contexts/auth-context";
import {
  isDriverApplicationApproved,
  isDriverApplicationSuspended,
  reinstateDriverReviewApplication,
  suspendDriverReviewApplication,
} from "@/lib/driver-review.service";
import {
  sendDriverReinstatedPushNotification,
  sendDriverSuspendedPushNotification,
} from "@/lib/push-notification.service";
import type { DriverReviewApplication } from "@/types/driver-review";

interface DriverSuspensionControlsProps {
  application: DriverReviewApplication;
  onUpdated: (application: DriverReviewApplication) => void;
}

export function DriverSuspensionControls({
  application,
  onUpdated,
}: DriverSuspensionControlsProps) {
  const { organization } = useAuth();
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showReinstateDialog, setShowReinstateDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  const suspended = isDriverApplicationSuspended(application);
  const approved = isDriverApplicationApproved(application);
  const organizationName = organization?.name?.trim() || "your organization";

  const notifyRefresh = () => {
    window.dispatchEvent(new CustomEvent("driverApplicationsUpdated"));
  };

  const suspendDriver = async () => {
    const normalizedReason = reason.trim();

    if (normalizedReason.length < 5) {
      toast.error("Enter a clear suspension reason of at least 5 characters.");
      return;
    }

    if (normalizedReason.length > 500) {
      toast.error("The suspension reason must be 500 characters or fewer.");
      return;
    }

    setWorking(true);

    try {
      const result = await suspendDriverReviewApplication(
        application.profile.$id,
        normalizedReason,
      );

      onUpdated(result.application);
      setShowSuspendDialog(false);
      setReason("");
      notifyRefresh();

      try {
        const push = await sendDriverSuspendedPushNotification({
          recipientUserId: result.application.profile.userId,
          driverId: result.application.profile.$id,
          organizationId: result.application.institution.organizationId,
          organizationName,
          reason: normalizedReason,
          activeRideContinues: result.activeRideContinues,
        });

        if (push.accepted > 0) {
          toast.success(`${result.application.profile.name} has been suspended and notified.`);
        } else {
          toast.success(`${result.application.profile.name} has been suspended.`);
          toast.error(push.message || "No active device token was available for the driver.");
        }
      } catch (pushError) {
        console.error("Suspension succeeded, but notification failed:", pushError);
        toast.success(`${result.application.profile.name} has been suspended.`);
        toast.error(
          pushError instanceof Error
            ? `Suspension succeeded, but notification failed: ${pushError.message}`
            : "Suspension succeeded, but the driver notification failed.",
        );
      }
    } catch (error) {
      console.error("Unable to suspend driver:", error);
      toast.error(error instanceof Error ? error.message : "Unable to suspend driver.");
    } finally {
      setWorking(false);
    }
  };

  const reinstateDriver = async () => {
    setWorking(true);

    try {
      const result = await reinstateDriverReviewApplication(application.profile.$id);
      onUpdated(result);
      setShowReinstateDialog(false);
      notifyRefresh();

      try {
        const push = await sendDriverReinstatedPushNotification({
          recipientUserId: result.profile.userId,
          driverId: result.profile.$id,
          organizationId: result.institution.organizationId,
          organizationName,
        });

        if (push.accepted > 0) {
          toast.success(`${result.profile.name} has been reinstated and notified.`);
        } else {
          toast.success(`${result.profile.name} has been reinstated.`);
          toast.error(push.message || "No active device token was available for the driver.");
        }
      } catch (pushError) {
        console.error("Reinstatement succeeded, but notification failed:", pushError);
        toast.success(`${result.profile.name} has been reinstated.`);
        toast.error(
          pushError instanceof Error
            ? `Reinstatement succeeded, but notification failed: ${pushError.message}`
            : "Reinstatement succeeded, but the driver notification failed.",
        );
      }
    } catch (error) {
      console.error("Unable to reinstate driver:", error);
      toast.error(error instanceof Error ? error.message : "Unable to reinstate driver.");
    } finally {
      setWorking(false);
    }
  };

  if (!approved && !suspended) return null;

  return (
    <>
      {suspended ? (
        <button
          type="button"
          onClick={() => setShowReinstateDialog(true)}
          disabled={working}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reinstate driver
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowSuspendDialog(true)}
          disabled={working}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
        >
          <ShieldOff className="h-4 w-4" />
          Suspend driver
        </button>
      )}

      {showSuspendDialog && !suspended && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <ShieldOff className="h-6 w-6" />
              </div>
              <button
                type="button"
                onClick={() => setShowSuspendDialog(false)}
                disabled={working}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="mt-4 text-xl font-bold">Suspend {application.profile.name}?</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              The driver will immediately lose access to new work from {organizationName}. A ride already boarding, active or delayed may be completed safely.
            </p>

            <label className="mt-5 block">
              <span className="text-sm font-semibold">Suspension reason</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={5}
                placeholder="Explain why this driver's access is being suspended..."
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/15 dark:border-gray-700 dark:bg-gray-950"
              />
              <span className="mt-1 block text-right text-xs text-gray-400">{reason.length}/500</span>
            </label>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              The reason and suspension details will be stored and sent to the driver.
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSuspendDialog(false)}
                disabled={working}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void suspendDriver()}
                disabled={working || reason.trim().length < 5}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                {working ? "Suspending…" : "Confirm suspension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReinstateDialog && suspended && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <RotateCcw className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-bold">Reinstate this driver?</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {application.profile.name} will regain access to ride work from {organizationName}. The driver will remain offline until they choose to go online.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowReinstateDialog(false)}
                disabled={working}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void reinstateDriver()}
                disabled={working}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {working ? "Reinstating…" : "Confirm reinstatement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
