"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { activateDeviceAccount, hasUnsyncedDeviceDrafts } from "./draft-store";

type Preflight = { uid: string; confirmed: boolean; checks: Promise<boolean>[] };
export function DraftAccountGuard() {
  const { user, loading } = useAuth();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    function changed(event: Event) {
      const detail = (event as CustomEvent<{ nextUid: string | null }>).detail;
      void activateDeviceAccount(detail.nextUid)
        .then((removed) => {
          if (removed)
            setNotice(
              "Akun berubah. Data pekerjaan perangkat dari akun sebelumnya telah dibersihkan.",
            );
        })
        .catch(() =>
          setNotice(
            "Akun berubah. Data perangkat akun sebelumnya tidak dapat dibersihkan; periksa penyimpanan browser.",
          ),
        );
    }
    function preflight(event: Event) {
      const detail = (event as CustomEvent<Preflight>).detail;
      detail.checks.push(
        hasUnsyncedDeviceDrafts(detail.uid)
          .then(
            (unsynced) =>
              !unsynced ||
              detail.confirmed ||
              window.confirm(
                "Ada draf HP yang belum tersinkron. Keluar akan menghapus draf tersebut. Lanjutkan?",
              ),
          )
          .catch(
            () =>
              detail.confirmed ||
              window.confirm(
                "Draf HP tidak dapat diperiksa. Keluar dapat menghapus pekerjaan yang belum tersinkron. Lanjutkan?",
              ),
          ),
      );
    }
    window.addEventListener("learning:account-change", changed);
    window.addEventListener("learning:signout-preflight", preflight);
    return () => {
      window.removeEventListener("learning:account-change", changed);
      window.removeEventListener("learning:signout-preflight", preflight);
    };
  }, []);
  useEffect(() => {
    if (loading) return;
    void activateDeviceAccount(user?.uid ?? null)
      .then((removed) => {
        if (removed) setNotice("Data pekerjaan perangkat dari akun sebelumnya telah dibersihkan.");
      })
      .catch(() =>
        setNotice("Penyimpanan perangkat tidak tersedia; pembersihan draf tidak dapat dipastikan."),
      );
  }, [user?.uid, loading]);
  return notice ? (
    <p aria-live="polite" className="mx-auto w-full max-w-3xl px-6 pt-3">
      {notice}
    </p>
  ) : null;
}
