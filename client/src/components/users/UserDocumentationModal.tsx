import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { User } from '@shared/schema';
import { Loader2, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserDocumentationModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

// Tipo local de estado de documentos
interface DocsState {
  identificationUrl?: string;
  diplomaUrl?: string;
  documentationStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

export default function UserDocumentationModal({ user, isOpen, onClose, onStatusChange }: UserDocumentationModalProps) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocsState>({
    identificationUrl: user.identificationUrl || undefined,
    diplomaUrl: user.diplomaUrl || undefined,
    documentationStatus: (user as any).documentationStatus || 'none'
  });
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cargar documentos frescos al abrir el modal
  useEffect(() => {
    async function loadDocs() {
      if (!isOpen) return;
      setIsFetching(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/users/${user.id}/documents`, { credentials: 'include' });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Error al obtener documentos');
        }
        const data = await res.json();
        setDocs({
          identificationUrl: data.identificationUrl || undefined,
          diplomaUrl: data.diplomaUrl || undefined,
          documentationStatus: data.documentationStatus || 'none'
        });
      } catch (e:any) {
        setFetchError(e.message || 'No se pudieron cargar los documentos');
      } finally {
        setIsFetching(false);
      }
    }
    loadDocs();
  }, [isOpen, user.id]);

  // Mutación para validar documentos
  const validateMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      const res = await fetch(`/api/users/${user.id}/documents/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Error en validación');
      return res.json();
    },
    onSuccess: (data) => {
      setDocs(d => ({ ...d, documentationStatus: data.documentationStatus }));
      toast({
        title: 'Estado actualizado',
        description: `Documentación ${data.documentationStatus === 'approved' ? 'aprobada' : 'rechazada'} correctamente.`
      });
      if (onStatusChange) onStatusChange();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'No se pudo actualizar el estado', variant: 'destructive' });
    }
  });

  const status = docs.documentationStatus;
  const statusBadge = (
    <Badge
      variant="outline"
      className={status === 'approved' ? 'bg-green-100 text-green-800' : status === 'rejected' ? 'bg-red-100 text-red-800' : status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}
    >
      {status === 'approved' ? 'Aprobada' : status === 'rejected' ? 'Rechazada' : status === 'pending' ? 'En revisión' : 'Sin docs'}
    </Badge>
  );

  const disabledApprove = validateMutation.isPending || status === 'approved' || (!docs.identificationUrl && !docs.diplomaUrl);
  const disabledReject = validateMutation.isPending || status === 'rejected' || (!docs.identificationUrl && !docs.diplomaUrl);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Validación de Documentación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Usuario</p>
              <p className="text-sm text-muted-foreground">{user.fullName} (@{user.username})</p>
            </div>
            {statusBadge}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Estado actual: {status}</span>
            <Button variant="ghost" size="sm" disabled={isFetching} onClick={() => {
              // Forzar recarga manual
              setIsFetching(true);
              setFetchError(null);
              fetch(`/api/users/${user.id}/documents`, { credentials: 'include' })
                .then(async r => {
                  if (!r.ok) throw new Error(await r.text() || 'Error');
                  const data = await r.json();
                  setDocs({
                    identificationUrl: data.identificationUrl || undefined,
                    diplomaUrl: data.diplomaUrl || undefined,
                    documentationStatus: data.documentationStatus || 'none'
                  });
                })
                .catch(e => setFetchError(e.message || 'Error al refrescar'))
                .finally(() => setIsFetching(false));
            }}>
              <RefreshCcw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>

          {fetchError && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
              {fetchError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="border rounded-md p-3">
              <p className="font-medium mb-2">Identificación</p>
              {isFetching ? (
                <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cargando...</div>
              ) : docs.identificationUrl ? (
                <div className="flex items-center gap-2">
                  <a href={docs.identificationUrl} target="_blank" rel="noreferrer" className="text-sm underline">Ver archivo</a>
                  <a href={docs.identificationUrl} download className="text-sm underline">Descargar</a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cargada</p>
              )}
            </div>
            <div className="border rounded-md p-3">
              <p className="font-medium mb-2">Título / Diploma</p>
              {isFetching ? (
                <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cargando...</div>
              ) : docs.diplomaUrl ? (
                <div className="flex items-center gap-2">
                  <a href={docs.diplomaUrl} target="_blank" rel="noreferrer" className="text-sm underline">Ver archivo</a>
                  <a href={docs.diplomaUrl} download className="text-sm underline">Descargar</a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cargado</p>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Revisa que los documentos sean legibles y auténticos antes de aprobar.
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={disabledReject}
              onClick={() => validateMutation.mutate('reject')}
            >
              {validateMutation.isPending && !disabledApprove ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Rechazar
            </Button>
            <Button
              variant="default"
              disabled={disabledApprove}
              onClick={() => validateMutation.mutate('approve')}
            >
              {validateMutation.isPending && !disabledReject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Aprobar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
