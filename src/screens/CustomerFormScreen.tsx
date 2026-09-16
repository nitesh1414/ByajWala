import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Title, Field, Btn } from '../components/ui';
import { getCustomer, saveCustomer } from '../db/repos';
import { useApp } from '../context/AppContext';

export default function CustomerFormScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const id = route.params?.id as number | undefined;
  const { refresh } = useApp();
  const [f, setF] = useState({
    full_name: '',
    mobile: '',
    alt_mobile: '',
    address: '',
    city: '',
    ref_name: '',
    ref_mobile: '',
    id_proof_type: '',
    id_proof_number: '',
    notes: '',
  });

  useEffect(() => {
    if (id) getCustomer(id).then((c) => c && setF({ ...f, ...c } as any));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.full_name.trim() || !f.mobile.trim()) {
      Alert.alert('Required', 'Name and mobile are required.');
      return;
    }
    await saveCustomer(f, id);
    refresh();
    nav.goBack();
  };

  return (
    <Screen>
      <Title>{id ? 'Edit customer' : 'New customer'}</Title>
      <Field label="Full name" value={f.full_name} onChangeText={set('full_name')} />
      <Field label="Mobile" value={f.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" />
      <Field label="Alternate mobile" value={f.alt_mobile} onChangeText={set('alt_mobile')} keyboardType="phone-pad" />
      <Field label="Address" value={f.address} onChangeText={set('address')} multiline />
      <Field label="City" value={f.city} onChangeText={set('city')} />
      <Field label="Reference / guarantor" value={f.ref_name} onChangeText={set('ref_name')} />
      <Field label="Reference mobile" value={f.ref_mobile} onChangeText={set('ref_mobile')} keyboardType="phone-pad" />
      <Field label="ID proof type" value={f.id_proof_type} onChangeText={set('id_proof_type')} placeholder="Aadhaar / PAN / Voter" />
      <Field label="ID proof number" value={f.id_proof_number} onChangeText={set('id_proof_number')} />
      <Field label="Notes" value={f.notes} onChangeText={set('notes')} multiline />
      <Btn label="Save customer" onPress={save} />
    </Screen>
  );
}
