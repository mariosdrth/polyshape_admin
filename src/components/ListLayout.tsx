import React from "react";
import { Pagination } from "@polyutils/components";
import LoadingOverlay from "./LoadingOverlay";

type Props = {
  toolbar: React.ReactNode;
  children: React.ReactNode;
  isDeleting: boolean;
  creating: boolean;
  totalPages: number;
  currentPage: number;
  setPage: (page: number) => void;
  confirmModal?: React.ReactNode;
  addEditModal?: React.ReactNode;
};

export default function ListLayout({
  toolbar,
  children,
  isDeleting,
  creating,
  totalPages,
  currentPage,
  setPage,
  confirmModal,
  addEditModal,
}: Props) {
  return (
    <>
      {toolbar}
      {children}
      <div className="pagination">
        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          setPage={setPage}
        />
      </div>
      <LoadingOverlay open={isDeleting} label="Deleting item" />
      <LoadingOverlay open={creating} label="Creating item" />
      {confirmModal}
      {addEditModal}
    </>
  );
}
