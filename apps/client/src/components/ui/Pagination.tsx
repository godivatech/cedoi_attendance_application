import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  accentColor?: string;
  showSummary?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  accentColor = '#0d5984',
  showSummary = true
}) => {
  if (totalRecords <= pageSize) return null;

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate page numbers to show (max 5 pages visible around current)
  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <View className={`flex-col sm:flex-row items-center ${showSummary ? 'justify-between' : 'justify-center'} mt-5 pt-4 border-t border-slate-200/80 gap-3`}>
      {/* Records Info */}
      {showSummary && (
        <Text className="text-xs font-semibold text-slate-500">
          Page <Text className="font-extrabold text-slate-800">{currentPage}</Text> of{' '}
          <Text className="font-extrabold text-slate-800">{totalPages}</Text>
        </Text>
      )}

      {/* Page Controls */}
      <View className="flex-row items-center gap-1.5">
        {/* Previous Button */}
        <TouchableOpacity
          disabled={currentPage === 1}
          onPress={() => onPageChange(currentPage - 1)}
          style={{ opacity: currentPage === 1 ? 0.4 : 1 }}
          className="flex-row items-center px-3 py-1.5 rounded-xl border border-slate-300 bg-white shadow-xs"
        >
          <ChevronLeft size={14} color="#334155" style={{ marginRight: 4 }} />
          <Text
            numberOfLines={1}
            style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined}
            className="text-xs font-extrabold text-slate-700"
          >
            Prev
          </Text>
        </TouchableOpacity>

        {/* First Page Quick Jump if offset */}
        {pages[0] > 1 && (
          <>
            <TouchableOpacity
              onPress={() => onPageChange(1)}
              style={{
                backgroundColor: currentPage === 1 ? accentColor : '#ffffff',
                borderColor: currentPage === 1 ? accentColor : '#cbd5e1'
              }}
              className="w-8 h-8 rounded-xl border items-center justify-center"
            >
              <Text style={{ color: currentPage === 1 ? '#ffffff' : '#334155' }} className="text-xs font-black">
                1
              </Text>
            </TouchableOpacity>
            {pages[0] > 2 && <Text className="text-xs font-bold text-slate-400 px-0.5">...</Text>}
          </>
        )}

        {/* Numeric Page Buttons */}
        {pages.map(page => (
          <TouchableOpacity
            key={page}
            onPress={() => onPageChange(page)}
            style={{
              backgroundColor: currentPage === page ? accentColor : '#ffffff',
              borderColor: currentPage === page ? accentColor : '#cbd5e1'
            }}
            className="w-8 h-8 rounded-xl border items-center justify-center"
          >
            <Text style={{ color: currentPage === page ? '#ffffff' : '#334155' }} className="text-xs font-black">
              {page}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Last Page Quick Jump if offset */}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <Text className="text-xs font-bold text-slate-400 px-0.5">...</Text>}
            <TouchableOpacity
              onPress={() => onPageChange(totalPages)}
              style={{
                backgroundColor: currentPage === totalPages ? accentColor : '#ffffff',
                borderColor: currentPage === totalPages ? accentColor : '#cbd5e1'
              }}
              className="w-8 h-8 rounded-xl border items-center justify-center"
            >
              <Text style={{ color: currentPage === totalPages ? '#ffffff' : '#334155' }} className="text-xs font-black">
                {totalPages}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Next Button */}
        <TouchableOpacity
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          style={{ opacity: currentPage === totalPages ? 0.4 : 1 }}
          className="flex-row items-center px-3 py-1.5 rounded-xl border border-slate-300 bg-white shadow-xs"
        >
          <Text
            numberOfLines={1}
            style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined}
            className="text-xs font-extrabold text-slate-700"
          >
            Next
          </Text>
          <ChevronRight size={14} color="#334155" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
