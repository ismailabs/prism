import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
export interface ModalProps { open: boolean; onOpenChange: (open:boolean)=>void; title: string; description?: string; children: ReactNode; wide?: boolean }
export function Modal({open,onOpenChange,title,description,children,wide=false}:ModalProps) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm data-[state=open]:animate-in"/><Dialog.Content className={`modal-content ${wide?'max-w-2xl':'max-w-lg'}`}><div className="mb-6 pr-8"><Dialog.Title className="text-xl font-semibold tracking-tight">{title}</Dialog.Title><Dialog.Description className={description?'mt-2 text-sm text-subtle':'sr-only'}>{description??title}</Dialog.Description></div>{children}<Dialog.Close aria-label="Close" className="absolute right-5 top-5 rounded-lg p-1.5 text-subtle hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"><X size={18}/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
