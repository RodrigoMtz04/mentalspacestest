import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { PRESET_COLORS, applyPrimaryFromHex, savePrimaryHex, setDarkMode, getDarkMode } from "@/lib/theme";

type Booking = {
    id: number;
    roomId: number;
    userId: number;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    status: "confirmed" | "cancelled" | "completed";
    notes?: string | null;
};

type User = {
    id: number;
    username: string;
    fullName: string;
    role: "admin" | "standard" | "trusted" | "vip" | "monthly";
    email: string;
    phone?: string | null;
    specialty?: string | null;
    bio?: string | null;
    profileImageUrl?: string | null;
    professionalType?: string | null;
    professionalTypeDetails?: string | null;
    professionalLicense?: string | null;
    identificationUrl?: string | null;
    diplomaUrl?: string | null;
    bookingCount?: number;
    isActive: boolean;
    paymentStatus: "active" | "inactive" | string;
    lastPaymentDate?: string | Date | null;
    subscriptionEndDate?: string | Date | null;
    documentationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
};

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [changingPass, setChangingPass] = useState(false);
    const { logoutAll } = useAuth();

    // Tab activo
    const [activeTab, setActiveTab] = useState<string>("info");

    // Profile form state
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [bio, setBio] = useState("");
    const [profileImageUrl, setProfileImageUrl] = useState("");
    const [professionalType, setProfessionalType] = useState("");
    const [professionalTypeDetails, setProfessionalTypeDetails] = useState("");
    const [professionalLicense, setProfessionalLicense] = useState("");

    // Password form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    // Documents
    const [identificationFile, setIdentificationFile] = useState<File | null>(null);
    const [diplomaFile, setDiplomaFile] = useState<File | null>(null);

    // Tema (apariencia)
    const [dark, setDark] = useState<boolean>(getDarkMode());
    const [primaryHex, setPrimaryHex] = useState<string>(() => {
        const saved = localStorage.getItem('theme.primaryHex');
        return saved || '#25703a';
    });
    // Entrada de color personalizada (texto)
    const [customHex, setCustomHex] = useState<string>(primaryHex);
    const [hexError, setHexError] = useState<string | null>(null);

    const isValidHex = (v: string) => /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v.trim());
    const normalizeHex = (v: string) => {
        const t = v.trim();
        if (!t) return t;
        return t.startsWith('#') ? t : `#${t}`;
    };
    const applyAndSaveHex = (hex: string) => {
        const normalized = normalizeHex(hex);
        if (!isValidHex(normalized)) {
            setHexError('Ingresa un color HEX válido, ej. #1a2b3c');
            return false;
        }
        setHexError(null);
        setPrimaryHex(normalized);
        setCustomHex(normalized);
        applyPrimaryFromHex(normalized);
        savePrimaryHex(normalized);
        return true;
    };

    // Previsualización modal
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLabel, setPreviewLabel] = useState<string>("");
    const [previewKind, setPreviewKind] = useState<"image" | "pdf">("image");
    const [pdfError, setPdfError] = useState(false);

    // URLs temporales para archivos seleccionados
    const identificationObjectUrl = useMemo(() => {
        if (!identificationFile) return null;
        try {
            return URL.createObjectURL(identificationFile);
        } catch {
            return null;
        }
    }, [identificationFile]);

    const diplomaObjectUrl = useMemo(() => {
        if (!diplomaFile) return null;
        try {
            return URL.createObjectURL(diplomaFile);
        } catch {
            return null;
        }
    }, [diplomaFile]);

    useEffect(() => {
        return () => {
            if (identificationObjectUrl) URL.revokeObjectURL(identificationObjectUrl);
            if (diplomaObjectUrl) URL.revokeObjectURL(diplomaObjectUrl);
        };
    }, [identificationObjectUrl, diplomaObjectUrl]);

    function openPreview(url: string, label: string, kind: "image" | "pdf") {
        setPreviewUrl(url);
        setPreviewLabel(label);
        setPreviewKind(kind);
        setPdfError(false);
        setPreviewOpen(true);
    }

    function isPdfFromUrl(url?: string | null) {
        if (!url) return false;
        const lower = url.toLowerCase();
        return lower.endsWith(".pdf") || lower.includes(".pdf");
    }

    const msg = useMessage();

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                // 1) Obtener usuario autenticado
                const meRes = await fetch("/api/user", { credentials: "include" });
                if (meRes.status === 401) {
                    if (!cancelled) {
                        setUser(null);
                        setLoading(false);
                        msg.info("Debes iniciar sesión para ver tu perfil.");
                    }
                    return;
                }
                if (!meRes.ok) throw new Error("Error al obtener el usuario actual");
                const me: User = await meRes.json();
                if (cancelled) return;

                setUser(me);
                // Prefill form
                setFullName(me.fullName ?? "");
                setEmail(me.email ?? "");
                setPhone(me.phone ?? "");
                setSpecialty(me.specialty ?? "");
                setBio(me.bio ?? "");
                setProfileImageUrl(me.profileImageUrl ?? "");
                setProfessionalType(me.professionalType ?? "");
                setProfessionalTypeDetails(me.professionalTypeDetails ?? "");
                setProfessionalLicense(me.professionalLicense ?? "");

                // 2) Obtener reservas del usuario
                const bookingsRes = await fetch(`/api/users/${me.id}/bookings`, { credentials: "include" });
                if (bookingsRes.ok) {
                    const data: Booking[] = await bookingsRes.json();
                    if (!cancelled) setBookings(data);
                }
            } catch (e: any) {
                if (!cancelled) msg.error(e?.message || "Error al cargar el perfil");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // Validación simple de archivos
    function validateFile(file: File | null): string | null {
        if (!file) return null;
        const allowedMimes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!allowedMimes.includes(file.type)) return "Formato no permitido. Usa JPG, JPEG, PNG, PDF, DOC o DOCX.";
        const max = 5 * 1024 * 1024; // 5MB
        if (file.size > max) return "El archivo excede 5MB.";
        return null;
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        msg.clear();
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: fullName || null,
                    email: email || null,
                    phone: phone || null,
                    specialty: specialty || null,
                    bio: bio || null,
                    profileImageUrl: profileImageUrl || null,
                    professionalType: professionalType || null,
                    professionalTypeDetails: professionalTypeDetails || null,
                    professionalLicense: professionalLicense || null,
                }),
            });
            if (!res.ok) {
                const j = await safeJson(res);
                throw new Error(j?.message || "Error al guardar perfil");
            }
            const updated: User = await res.json();
            setUser(updated);
            msg.success("Perfil actualizado correctamente");
        } catch (e: any) {
            msg.error(e?.message || "No se pudo actualizar el perfil");
        } finally {
            setSaving(false);
        }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        if (!currentPassword || !newPassword) {
            msg.info("Ingresa la contraseña actual y la nueva contraseña.");
            return;
        }
        setChangingPass(true);
        msg.clear();
        try {
            const res = await fetch(`/api/users/${user.id}/change-password`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const j = await safeJson(res);
            if (!res.ok) {
                throw new Error(j?.message || "Error al cambiar contraseña");
            }
            msg.success(j?.message || "Contraseña actualizada");
            setCurrentPassword("");
            setNewPassword("");
        } catch (e: any) {
            msg.error(e?.message || "No se pudo cambiar la contraseña");
        } finally {
            setChangingPass(false);
        }
    }

    async function handleUploadDocuments(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        if (!identificationFile && !diplomaFile) {
            msg.info("Selecciona al menos un archivo.");
            return;
        }
        // Validación
        const idErr = validateFile(identificationFile);
        const dpErr = validateFile(diplomaFile);
        if (idErr || dpErr) {
            msg.error(idErr || dpErr || "Archivo inválido");
            return;
        }

        setUploading(true);
        msg.clear();
        try {
            const fd = new FormData();
            if (identificationFile) fd.append("identification", identificationFile);
            if (diplomaFile) fd.append("diploma", diplomaFile);

            const res = await fetch(`/api/users/${user.id}/documents`, {
                method: "POST",
                credentials: "include",
                body: fd,
            });
            const j = await safeJson(res);
            if (!res.ok) {
                throw new Error(j?.message || "Error al subir documentos");
            }
            const updated: User = j;
            setUser(updated);
            msg.success("Documentos subidos correctamente");
            setIdentificationFile(null);
            setDiplomaFile(null);
            // limpiar inputs file visualmente
            const idInput = document.getElementById("id-file") as HTMLInputElement | null;
            if (idInput) idInput.value = "";
            const diplomaInput = document.getElementById("diploma-file") as HTMLInputElement | null;
            if (diplomaInput) diplomaInput.value = "";
        } catch (e: any) {
            msg.error(e?.message || "No se pudieron subir los documentos");
        } finally {
            setUploading(false);
        }
    }

    async function handleLogoutAllDevices() {
        if (!window.confirm("¿Seguro que deseas cerrar sesión en todos tus dispositivos?")) return;
        await logoutAll();
    }

    if (loading) {
        return (
            <div style={{ padding: 24 }}>
                <h2>Perfil</h2>
                <p>Cargando...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ padding: 24 }}>
                <h2>Perfil</h2>
                {msg.node}
                <p>No autenticado.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
            <h2>Perfil</h2>
            {msg.node}

            <section
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 24,
                    marginTop: 12,
                }}
            >
                {/* Cabecera */}
                <div className="flex gap-4 items-center p-4 border border-border rounded-md bg-card text-card-foreground">
                    <img
                        src={
                            user.profileImageUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}`
                        }
                        alt="avatar"
                        style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }}
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                user.fullName || user.username
                            )}`;
                        }}
                    />
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>
                            {user.fullName || user.username} <span className="text-muted-foreground">({user.role})</span>
                        </div>
                        <div className="text-muted-foreground">{user.email}</div>
                        <div style={{ marginTop: 6 }}>
                            Documentación: {" "}
                            <strong style={{ color: (user as any).documentationStatus === 'approved' ? '#2e7d32' : (user as any).documentationStatus === 'rejected' ? '#c62828' : '#ed6c02' }}>
                                {(user as any).documentationStatus === 'approved' ? 'aprobada' : (user as any).documentationStatus === 'rejected' ? 'rechazada' : (user as any).documentationStatus === 'pending' ? 'en revisión' : 'sin documentos'}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* Navegación por secciones */}
                <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="info">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="info">Información</TabsTrigger>
                        <TabsTrigger value="prof">Profesional</TabsTrigger>
                        <TabsTrigger value="docs">Documentos</TabsTrigger>
                        <TabsTrigger value="pagos">Pagos</TabsTrigger>
                        <TabsTrigger value="pass">Contraseña</TabsTrigger>
                        <TabsTrigger value="appearance">Apariencia</TabsTrigger>
                    </TabsList>

                    {/* Información */}
                    <TabsContent value="info">
                        <form onSubmit={handleSaveProfile} className="border border-border rounded-md p-4 bg-card text-card-foreground">
                            <h3 style={{ marginTop: 0 }}>Datos de perfil</h3>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 12,
                                }}
                            >
                                <TextField label="Nombre completo" value={fullName} onChange={setFullName} />
                                <TextField label="Correo" value={email} onChange={setEmail} type="email" />
                                <TextField label="Teléfono" value={phone} onChange={setPhone} />
                                <TextArea label="Bio" value={bio} onChange={setBio} rows={4} />
                                <TextField label="URL de imagen de perfil" value={profileImageUrl} onChange={setProfileImageUrl} />
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button type="submit" disabled={saving} className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
                                    {saving ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* Profesional */}
                    <TabsContent value="prof">
                        <form onSubmit={handleSaveProfile} className="border border-border rounded-md p-4 bg-card text-card-foreground">
                            <h3 style={{ marginTop: 0 }}>Datos profesionales</h3>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 12,
                                }}
                            >
                                <TextField label="Especialidad" value={specialty} onChange={setSpecialty} />
                                <TextField label="Profesión" value={professionalType} onChange={setProfessionalType} />
                                <TextField label="Detalles de profesión" value={professionalTypeDetails} onChange={setProfessionalTypeDetails} />
                                <TextField label="Cédula profesional" value={professionalLicense} onChange={setProfessionalLicense} />
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button type="submit" disabled={saving} className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
                                    {saving ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* Documentos */}
                    <TabsContent value="docs">
                        <form onSubmit={handleUploadDocuments} className="border border-border rounded-md p-4 bg-card text-card-foreground">
                            <h3 style={{ marginTop: 0 }}>Documentos</h3>
                            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                                <div style={{ minWidth: 280 }}>
                                    <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                                        Identificación (INE/Pasaporte)
                                    </label>
                                    <input
                                        id="id-file"
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                        onChange={(e) => setIdentificationFile(e.target.files?.[0] ?? null)}
                                    />
                                    {/* Previsualización del archivo seleccionado o del actual */}
                                    <div style={{ marginTop: 8 }}>
                                        {identificationFile ? (
                                            identificationFile.type === "application/pdf" ? (
                                                <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 8 }}>
                                                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>PDF seleccionado</div>
                                                    <div style={{ display: "flex", gap: 8 }}>
                                                        <Button type="button" size="sm" onClick={() => identificationObjectUrl && openPreview(identificationObjectUrl, "Identificación", "pdf")} disabled={!identificationObjectUrl}>
                                                            Ver
                                                        </Button>
                                                        <div style={{ fontSize: 12, color: "#777" }}>{identificationFile.name}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 6 }}>
                                                    {identificationObjectUrl ? (
                                                        <img
                                                            src={identificationObjectUrl}
                                                            alt="Previsualización Identificación"
                                                            style={{ maxHeight: 160, width: "100%", objectFit: "contain", borderRadius: 4, cursor: "pointer" }}
                                                            onClick={() => openPreview(identificationObjectUrl, "Identificación", "image")}
                                                            onError={(e) => ((e.currentTarget.style.display = "none"))}
                                                        />
                                                    ) : null}
                                                    <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                                                        <Button type="button" size="sm" onClick={() => identificationObjectUrl && openPreview(identificationObjectUrl, "Identificación", "image")}
                                                                disabled={!identificationObjectUrl}>Ver</Button>
                                                        <div style={{ fontSize: 12, color: "#777" }}>{identificationFile.name}</div>
                                                    </div>
                                                </div>
                                            )
                                        ) : user?.identificationUrl ? (
                                            isPdfFromUrl(user.identificationUrl) ? (
                                                <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 8 }}>
                                                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>PDF cargado</div>
                                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                        <Button type="button" size="sm" onClick={() => openPreview(user.identificationUrl!, "Identificación", "pdf")}>
                                                            Ver
                                                        </Button>
                                                        <a href={user.identificationUrl!} download>
                                                            Descargar
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 6 }}>
                                                    <img
                                                        src={user.identificationUrl!}
                                                        alt="Identificación"
                                                        style={{ maxHeight: 160, width: "100%", objectFit: "contain", borderRadius: 4, cursor: "pointer" }}
                                                        onClick={() => openPreview(user.identificationUrl!, "Identificación", "image")}
                                                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                                                    />
                                                    <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                                                        <Button type="button" size="sm" onClick={() => openPreview(user.identificationUrl!, "Identificación", "image")}>
                                                            Ver
                                                        </Button>
                                                        <a href={user.identificationUrl!} download>
                                                            Descargar
                                                        </a>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div style={{ marginTop: 6, color: "#777" }}>No cargado</div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ minWidth: 280 }}>
                                    <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                                        Título profesional
                                    </label>
                                    <input
                                        id="diploma-file"
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                        onChange={(e) => setDiplomaFile(e.target.files?.[0] ?? null)}
                                    />
                                    {/* Previsualización del archivo seleccionado o del actual */}
                                    <div style={{ marginTop: 8 }}>
                                        {diplomaFile ? (
                                            diplomaFile.type === "application/pdf" ? (
                                                <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 8 }}>
                                                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>PDF seleccionado</div>
                                                    <div style={{ display: "flex", gap: 8 }}>
                                                        <Button type="button" size="sm" onClick={() => diplomaObjectUrl && openPreview(diplomaObjectUrl, "Título profesional", "pdf")} disabled={!diplomaObjectUrl}>
                                                            Ver
                                                        </Button>
                                                        <div style={{ fontSize: 12, color: "#777" }}>{diplomaFile.name}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 6 }}>
                                                    {diplomaObjectUrl ? (
                                                        <img
                                                            src={diplomaObjectUrl}
                                                            alt="Previsualización Título"
                                                            style={{ maxHeight: 160, width: "100%", objectFit: "contain", borderRadius: 4, cursor: "pointer" }}
                                                            onClick={() => openPreview(diplomaObjectUrl, "Título profesional", "image")}
                                                            onError={(e) => ((e.currentTarget.style.display = "none"))}
                                                        />
                                                    ) : null}
                                                    <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                                                        <Button type="button" size="sm" onClick={() => diplomaObjectUrl && openPreview(diplomaObjectUrl, "Título profesional", "image")} disabled={!diplomaObjectUrl}>Ver</Button>
                                                        <div style={{ fontSize: 12, color: "#777" }}>{diplomaFile.name}</div>
                                                    </div>
                                                </div>
                                            )
                                        ) : user?.diplomaUrl ? (
                                            isPdfFromUrl(user.diplomaUrl) ? (
                                                <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 8 }}>
                                                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>PDF cargado</div>
                                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                        <Button type="button" size="sm" onClick={() => openPreview(user.diplomaUrl!, "Título profesional", "pdf")}>
                                                            Ver
                                                        </Button>
                                                        <a href={user.diplomaUrl!} download>
                                                            Descargar
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 6 }}>
                                                    <img
                                                        src={user.diplomaUrl!}
                                                        alt="Título"
                                                        style={{ maxHeight: 160, width: "100%", objectFit: "contain", borderRadius: 4, cursor: "pointer" }}
                                                        onClick={() => openPreview(user.diplomaUrl!, "Título profesional", "image")}
                                                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                                                    />
                                                    <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                                                        <Button type="button" size="sm" onClick={() => openPreview(user.diplomaUrl!, "Título profesional", "image")}>
                                                            Ver
                                                        </Button>
                                                        <a href={user.diplomaUrl!} download>
                                                            Descargar
                                                        </a>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div style={{ marginTop: 6, color: "#777" }}>No cargado</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button type="submit" disabled={uploading} className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
                                    {uploading ? "Subiendo..." : "Subir documentos"}
                                </button>
                            </div>
                            <div className="text-sm text-muted-foreground" style={{ marginTop: 8, color: "#777", fontSize: 12 }}>
                                Formatos permitidos: JPG, PNG, PDF. Máx. 5MB.
                            </div>

                            {/* Modal de previsualización */}
                            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                                <DialogContent className="max-w-4xl w-[92vw]">
                                    <DialogHeader>
                                        <DialogTitle>{previewLabel}</DialogTitle>
                                    </DialogHeader>
                                    <div className="rounded-md border overflow-hidden">
                                        {previewUrl && (previewKind === "image" ? (
                                            <img
                                                src={previewUrl}
                                                alt={previewLabel}
                                                className="max-h-[80vh] w-full object-contain"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-[80vh]">
                                                {!pdfError ? (
                                                    <iframe
                                                        src={previewUrl}
                                                        title={previewLabel}
                                                        className="w-full h-full"
                                                        onError={() => setPdfError(true)}
                                                    />
                                                ) : (
                                                    <div className="p-4 text-sm text-muted-foreground">
                                                        No se puede visualizar el PDF aquí. Usa los botones para abrir en una pestaña nueva o descargar.
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        {previewUrl ? (
                                            <>
                                                <a href={previewUrl} target="_blank" rel="noreferrer">
                                                    <Button variant="secondary" size="sm">Abrir en nueva pestaña</Button>
                                                </a>
                                                <a href={previewUrl} download>
                                                    <Button variant="default" size="sm">Descargar</Button>
                                                </a>
                                            </>
                                        ) : null}
                                        <div className="ml-auto" />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </form>
                    </TabsContent>

                    {/* Pagos */}
                    <TabsContent value="pagos">
                        <div className="border border-border rounded-md p-4 bg-card text-card-foreground">
                            <h3 style={{ marginTop: 0 }}>Pagos</h3>
                            <div style={{ display: "flex", gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            const meRes = await fetch("/api/user", { credentials: "include" });
                                            if (meRes.ok) {
                                                const me: User = await meRes.json();
                                                setUser(me);
                                            }
                                        } catch {}
                                    }}
                                >
                                    Refrescar estado
                                </Button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <InfoRow label="Estado de pago" value={String(user.paymentStatus || "-")} />
                                <InfoRow label="Último pago" value={user.lastPaymentDate ? new Date(user.lastPaymentDate).toLocaleString() : "-"} />
                                {user.subscriptionEndDate ? (
                                    <InfoRow label="Fin de suscripción" value={new Date(user.subscriptionEndDate as any).toLocaleString()} />
                                ) : null}
                            </div>
                            <div style={{ marginTop: 12, color: "#777", fontSize: 12 }}>
                                Si necesitas actualizar tu método de pago, contáctanos o ve a la sección de planes.
                            </div>
                        </div>
                    </TabsContent>

                    {/* Contraseña */}
                    <TabsContent value="pass">
                        <form onSubmit={handleChangePassword} className="border border-border rounded-md p-4 bg-card text-card-foreground">
                            <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 12,
                                }}
                            >
                                <TextField
                                    label="Contraseña actual"
                                    value={currentPassword}
                                    onChange={setCurrentPassword}
                                    type="password"
                                />
                                <TextField
                                    label="Nueva contraseña"
                                    value={newPassword}
                                    onChange={setNewPassword}
                                    type="password"
                                />
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                <button type="submit" disabled={changingPass} className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
                                    {changingPass ? "Cambiando..." : "Actualizar contraseña"}
                                </button>
                                <Button type="button" variant="destructive" onClick={handleLogoutAllDevices}>
                                    Cerrar sesión en todos los dispositivos
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* Apariencia */}
                    <TabsContent value="appearance">
                        <div className="border border-border rounded-md p-4 bg-card text-card-foreground">
                            <h3 style={{ marginTop: 0 }}>Tema y colores</h3>
                            <div style={{ display: 'grid', gap: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Modo</div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input
                                                type="checkbox"
                                                checked={dark}
                                                onChange={(e) => {
                                                    const v = e.target.checked;
                                                    setDark(v);
                                                    setDarkMode(v);
                                                }}
                                            />
                                            Modo oscuro
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Color primario</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                        {PRESET_COLORS.map((c) => {
                                            const selected = primaryHex.toLowerCase() === c.hex.toLowerCase();
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setPrimaryHex(c.hex);
                                                        setCustomHex(c.hex);
                                                        applyPrimaryFromHex(c.hex);
                                                        savePrimaryHex(c.hex);
                                                    }}
                                                    title={c.name}
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        border: selected ? '3px solid var(--ring, #94a3b8)' : '2px solid #e5e7eb',
                                                        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.4)' : 'none',
                                                        background: c.hex,
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                                        Los colores están seleccionados para buen contraste en claro/oscuro.
                                    </div>
                                </div>
                                {/* Color personalizado */}
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Color personalizado</div>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input
                                            type="color"
                                            value={primaryHex}
                                            onChange={(e) => {
                                                applyAndSaveHex(e.target.value);
                                            }}
                                            aria-label="Selector de color"
                                            className="h-10 w-10 rounded-md border border-input bg-background p-0"
                                        />
                                        <input
                                            type="text"
                                            value={customHex}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setCustomHex(v);
                                                if (isValidHex(v)) {
                                                    setHexError(null);
                                                } else {
                                                    setHexError('HEX inválido');
                                                }
                                            }}
                                            onBlur={() => {
            if (customHex && isValidHex(customHex)) applyAndSaveHex(customHex);
        }}
                                            placeholder="#RRGGBB"
                                            className="px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                            style={{ width: 160 }}
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => applyAndSaveHex(customHex)}
                                            disabled={!isValidHex(customHex)}
                                        >
                                            Aplicar
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                applyAndSaveHex('#25703a');
                                            }}
                                        >
                                            Restablecer
                                        </Button>
                                    </div>
                                    {hexError && (
                                        <div className="text-sm text-muted-foreground" style={{ marginTop: 6 }}>
                                            {hexError}
                                        </div>
                                    )}
                                 </div>
                             </div>
                         </div>
                     </TabsContent>
                </Tabs>

                {/* Reservas (opcional, fuera de tabs) */}
                <div className="border border-border rounded-md p-4 bg-card text-card-foreground">
                    <h3 style={{ marginTop: 0 }}>Mis reservas</h3>
                    {bookings.length === 0 ? (
                        <div style={{ color: "#777" }}>Sin reservas.</div>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {bookings.map((b) => (
                                <li
                                    key={b.id}
                                    style={{
                                        padding: "10px 8px",
                                        borderBottom: "1px solid #eee",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            #{b.id} • Sala {b.roomId} • {b.date}
                                        </div>
                                        <div style={{ color: "#555" }}>
                                            {b.startTime} - {b.endTime} • {b.status}
                                        </div>
                                        {b.notes ? <div style={{ color: "#777" }}>{b.notes}</div> : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
        </div>
    );
}

function TextField(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
}) {
    return (
        <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{props.label}</span>
            <input
                type={props.type || "text"}
                value={props.value}
                onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
                className="px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            />
        </label>
    );
}

function TextArea(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    rows?: number;
}) {
    return (
        <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{props.label}</span>
            <textarea
                rows={props.rows || 3}
                value={props.value}
                onChange={(e) => props.onChange((e.target as HTMLTextAreaElement).value)}
                className="px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-y"
            />
        </label>
    );
}

function InfoRow(props: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-2 gap-2 items-center">
            <div className="text-muted-foreground">{props.label}</div>
            <div className="font-semibold">{props.value}</div>
        </div>
    );
}

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function useMessage() {
    const [message, setMessage] = useState<string | null>(null);
    const [variant, setVariant] = useState<"success" | "error" | "info">("info");
    const api = useMemo(
        () => ({
            info: (m: string) => {
                setVariant("info");
                setMessage(m);
            },
            success: (m: string) => {
                setVariant("success");
                setMessage(m);
            },
            error: (m: string) => {
                setVariant("error");
                setMessage(m);
            },
            clear: () => setMessage(null),
        }),
        []
    );
    const node =
        message !== null ? (
            <div
                style={{
                    margin: "12px 0",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor:
                        variant === "success" ? "#2e7d32" : variant === "error" ? "#c62828" : "#1565c0",
                    color:
                        variant === "success" ? "#2e7d32" : variant === "error" ? "#c62828" : "#1565c0",
                    background:
                        variant === "success" ? "#e8f5e9" : variant === "error" ? "#ffebee" : "#e3f2fd",
                }}
            >
                {message}
            </div>
        ) : null;

    return { node, ...api };
}
