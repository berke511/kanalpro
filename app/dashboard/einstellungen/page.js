'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles';
import { PLANS } from '@/lib/plans';
import StorageBar from '@/components/StorageBar';