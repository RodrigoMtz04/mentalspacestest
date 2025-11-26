import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function isPdf(url?: string | null) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith(".pdf") || lower.includes(".pdf");
}

function DocPreview({ label, url, onView }: { label: string; url?: string | null; onView: (url: string, label: string, kind: "image" | "pdf") => void }) {
    if (!url) {
        return (
            <div className="rounded-md border bg-muted/40 p-6 text-sm text-muted-foreground">
                {label} no cargado
            </div>
        );
    }

    const isPdfFile = isPdf(url);
    return (
        <div className="space-y-3">
            {isPdfFile ? (
                <div className="rounded-md border p-4">
                    <p className="text-sm mb-2">Archivo PDF</p>
                    <div className="flex gap-2">
                        <Button variant="default" size="sm" onClick={() => onView(url, label, "pdf")}>Ver</Button>
                        <a href={url} download className="ml-auto">
                            <Button variant="secondary" size="sm">Descargar</Button>
                        </a>
                    </div>
                </div>
            ) : (
                <div className="rounded-md border p-2">
                    <img
                        src={url}
                        alt={label}
                        className="max-h-64 w-full object-contain rounded cursor-pointer"
                        onClick={() => onView(url, label, "image")}
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                    />
                    <div className="mt-2 flex items-center gap-2">
                        <Button variant="default" size="sm" onClick={() => onView(url, label, "image")}>Ver</Button>
                        <a href={url} download className="ml-auto">
                            <Button variant="secondary" size="sm">Descargar</Button>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DocumentsPage() {
    const { user, isLoading } = useAuth();
    const [open, setOpen] = React.useState(false);
    const [viewUrl, setViewUrl] = React.useState<string | null>(null);
    const [viewLabel, setViewLabel] = React.useState<string>("");
    const [viewKind, setViewKind] = React.useState<"image" | "pdf">("image");
    const [pdfError, setPdfError] = React.useState(false);

    function handleView(url: string, label: string, kind: "image" | "pdf") {
        setViewUrl(url);
        setViewLabel(label);
        setViewKind(kind);
        setPdfError(false);
        setOpen(true);
    }

    if (isLoading) {
        return (
            <div className="p-6">
                <h2 className="text-xl font-semibold">Mis documentos</h2>
                <p className="text-sm text-muted-foreground mt-2">Cargando…</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-6">
                <h2 className="text-xl font-semibold">Mis documentos</h2>
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>No has iniciado sesión</CardTitle>
                        <CardDescription>Inicia sesión para consultar tus documentos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/auth">
                            <Button>Ir a iniciar sesión</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const hasAny = !!(user.identificationUrl || user.diplomaUrl);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Mis documentos</h2>
                <Link href="/profile">
                    <Button variant="outline" size="sm">Subir/Actualizar documentos</Button>
                </Link>
            </div>

            {!hasAny && (
                <Card>
                    <CardHeader>
                        <CardTitle>No hay documentos cargados</CardTitle>
                        <CardDescription>
                            Sube una identificación oficial (INE/Pasaporte) o tu título profesional desde tu perfil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/profile">
                            <Button>Ir a Mi Perfil</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Identificación (INE/Pasaporte)</CardTitle>
                        <CardDescription>Documento de identidad</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DocPreview label="Identificación" url={user.identificationUrl} onView={handleView} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Título profesional</CardTitle>
                        <CardDescription>Diploma o cédula</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DocPreview label="Título" url={user.diplomaUrl} onView={handleView} />
                    </CardContent>
                </Card>
            </div>

            <div className="text-xs text-muted-foreground">
                Formatos permitidos: JPG, PNG, PDF. Si un documento no se visualiza correctamente, usa Descargar.
            </div>

            {/* Modal de visualización */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-4xl w-[92vw]">
                    <DialogHeader>
                        <DialogTitle>{viewLabel}</DialogTitle>
                    </DialogHeader>
                    <div className="rounded-md border overflow-hidden">
                        {viewUrl && (viewKind === "image" ? (
                            <img src={viewUrl} alt={viewLabel} className="max-h-[80vh] w-full object-contain" />
                        ) : (
                            <div className="w-full h-[80vh]">
                                {!pdfError ? (
                                    <iframe src={viewUrl} title={viewLabel} className="w-full h-full" onError={() => setPdfError(true)} />
                                ) : (
                                    <div className="p-4 text-sm text-muted-foreground">
                                        No se puede visualizar el PDF aquí. Usa los botones para abrir en una pestaña nueva o descargar.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                        {viewUrl ? (
                            <>
                                <a href={viewUrl} target="_blank" rel="noreferrer">
                                    <Button variant="secondary" size="sm">Abrir en nueva pestaña</Button>
                                </a>
                                <a href={viewUrl} download>
                                    <Button variant="default" size="sm">Descargar</Button>
                                </a>
                            </>
                        ) : null}
                        <div className="ml-auto" />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
