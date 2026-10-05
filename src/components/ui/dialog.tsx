import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export interface ModalProps { open: boolean; onOpenChange: (open:boolean)=>void; title: string; description?: string; children: ReactNode; wide?: boolean }
export function Modal({open,onOpenChange,title,description,children,wide=false}:ModalProps) {
  const { t } = useTranslation();
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="modal-overlay fixed inset-0 z-40 bg-slate-950/40"/><Dialog.Content className={`modal-content ${wide?'max-w-2xl':'max-w-lg'}`}><div className="modal-heading mb-6 pr-10"><Dialog.Title className="text-xl font-semibold tracking-tight">{title}</Dialog.Title><Dialog.Description className={description?'mt-2 text-sm text-subtle':'sr-only'}>{description??title}</Dialog.Description></div>{children}<Dialog.Close aria-label={t('close')} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg text-subtle hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"><X size={18}/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
