# Generated by Django 3.2.25 on 2024-10-11 07:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0002_room'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]