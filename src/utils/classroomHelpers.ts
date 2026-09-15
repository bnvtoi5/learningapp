import { Classroom } from '../types';

/**
 * Lấy danh sách duy nhất các Tên Lớp (Grade / Group Names)
 * Ví dụ: ["Lớp 9", "Lớp 8", "Lớp 10"]
 */
export function getDistinctClassNames(classrooms: Classroom[] = []): string[] {
  const names = new Set<string>();
  classrooms.forEach(c => {
    if (c.name && c.name.trim()) {
      names.add(c.name.trim());
    }
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
}

/**
 * Lấy danh sách các Classroom thuộc một Tên Lớp cụ thể
 */
export function getClassroomsByName(classrooms: Classroom[] = [], className: string): Classroom[] {
  if (!className || className === 'all') return classrooms;
  return classrooms.filter(c => c.name.trim().toLowerCase() === className.trim().toLowerCase());
}

/**
 * Nhóm tất cả các Classroom theo Tên Lớp
 * Trả về: { [className: string]: Classroom[] }
 */
export function groupClassroomsByName(classrooms: Classroom[] = []): Record<string, Classroom[]> {
  const grouped: Record<string, Classroom[]> = {};
  classrooms.forEach(c => {
    const key = (c.name && c.name.trim()) ? c.name.trim() : 'Khác';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(c);
  });
  return grouped;
}

/**
 * Tìm Classroom theo ID
 */
export function findClassroomById(classrooms: Classroom[] = [], classId?: string): Classroom | undefined {
  if (!classId) return undefined;
  return classrooms.find(c => c.id === classId);
}

/**
 * Tìm Tên Lớp từ Classroom ID
 */
export function getClassNameFromId(classrooms: Classroom[] = [], classId?: string): string {
  const found = findClassroomById(classrooms, classId);
  return found ? found.name : '';
}

/**
 * Kiểm tra xem một mã lớp (Code) đã tồn tại hay chưa (loại trừ excludeId nếu đang sửa)
 */
export function isClassCodeDuplicate(
  classrooms: Classroom[] = [], 
  code: string, 
  excludeId?: string
): boolean {
  const clean = code.trim().toLowerCase();
  return classrooms.some(c => c.code.trim().toLowerCase() === clean && c.id !== excludeId);
}
