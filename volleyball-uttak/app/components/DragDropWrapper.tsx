"use client";

import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ReactNode } from "react";

interface DragDropWrapperProps {
  children: ReactNode;
  onDragStart: (event: any) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

export default function DragDropWrapper({
  children,
  onDragStart,
  onDragEnd,
}: DragDropWrapperProps) {
  // Configure sensors for better touch support and drag activation
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5, // Reduced for easier activation
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150, // Reduced delay for better responsiveness
      tolerance: 5, // Reduced tolerance for easier activation
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  return (
    <DndContext
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      sensors={sensors}>
      {children}
    </DndContext>
  );
}
