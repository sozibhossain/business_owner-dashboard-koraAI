/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

type ServiceFormState = {
  name: string;
  description: string;
  duration: string;
  price: string;
  isActive: boolean;
};

const emptyForm: ServiceFormState = {
  name: "",
  description: "",
  duration: "60",
  price: "0",
  isActive: true,
};

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["services", search],
    queryFn: () =>
      servicesApi
        .getAll({ limit: 100, search: search || undefined })
        .then((response) => response.data),
  });

  const services = (data?.data || []) as any[];

  useEffect(() => {
    if (!dialogOpen) {
      setEditingId(null);
      setForm(emptyForm);
    }
  }, [dialogOpen]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (service: any) => {
    setEditingId(service._id);
    setForm({
      name: service.name || "",
      description: service.description || "",
      duration: String(service.duration ?? 60),
      price: String(service.price ?? 0),
      isActive: service.isActive !== false,
    });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      servicesApi.create({
        name: form.name,
        description: form.description,
        duration: Number(form.duration) || 0,
        price: Number(form.price) || 0,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service created");
      setDialogOpen(false);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to create service"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      servicesApi.update(id, {
        name: form.name,
        description: form.description,
        duration: Number(form.duration) || 0,
        price: Number(form.price) || 0,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service updated");
      setDialogOpen(false);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to update service"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service deleted");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to delete service"),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId });
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <Header
        title="Services"
        subtitle="Manage the services your team offers."
        action={
          <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Service
          </Button>
        }
      />

      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search services..."
                className="pl-9"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#1e2d40] text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Duration</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="border-b border-[#1e2d40]">
                        <td className="py-2 pr-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="py-2 pr-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="py-2 pr-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="py-2 pr-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="py-2 pr-4">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                      </tr>
                    ))
                  ) : services.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-gray-500">
                        No services yet. Add your first service to get started.
                      </td>
                    </tr>
                  ) : (
                    services.map((service) => (
                      <tr key={service._id} className="border-b border-[#1e2d40] last:border-0">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="text-sm font-medium text-gray-100">{service.name}</p>
                            {service.description ? (
                              <p className="text-[11px] text-gray-500">{service.description}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-300">{service.duration} min</td>
                        <td className="py-3 pr-4 text-gray-300">${Number(service.price || 0).toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={service.isActive ? "success" : "secondary"} className="text-[10px]">
                            {service.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => openEdit(service)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-red-400 hover:text-red-300"
                              onClick={() => {
                                if (confirm(`Delete service "${service.name}"?`)) {
                                  deleteMutation.mutate(service._id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Name</label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Haircut"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Description</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Short description shown to staff and customers"
                className="min-h-[80px] w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Duration (minutes)</label>
                <Input
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(event) => setForm({ ...form, duration: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Price (USD)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="h-4 w-4 rounded border-[#2a3547] bg-[#0d1526]"
              />
              Active
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? editingId
                  ? "Saving..."
                  : "Creating..."
                : editingId
                ? "Save changes"
                : "Create service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
